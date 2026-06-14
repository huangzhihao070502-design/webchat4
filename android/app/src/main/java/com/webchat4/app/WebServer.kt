package com.webchat4.app

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.*
import java.net.HttpURLConnection
import java.net.ServerSocket
import java.net.Socket
import java.net.URL
import java.security.SecureRandom
import java.security.cert.X509Certificate
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.Executors
import javax.net.ssl.*

class WebServer(private val context: Context, private val port: Int = 3001) {

    private var serverSocket: ServerSocket? = null
    private var running = false
    private val threadPool = Executors.newFixedThreadPool(8)

    // ── 静态文件目录（从 assets 解压到 filesDir） ──
    private val wwwDir: File = File(context.filesDir, "www")

    // ── 持久化状态 ──
    private val stateFile = File(context.filesDir, "state.json")
    private var botToken: String? = null
    private var botId: String? = null
    private var cursor: String = ""
    private val messages = mutableListOf<JSONObject>()
    private var msgId = 0
    private val contextTokens = mutableMapOf<String, String>()
    private val processedMsgIds = mutableSetOf<String>()
    private var qrStatus: String = "idle"
    private var qrKey: String? = null

    companion object {
        private const val ILINK_HOST = "ilinkai.weixin.qq.com"
        private const val TAG = "WebServer"
    }

    fun isRunning(): Boolean = running

    fun start(): Boolean {
        return try {
            extractWww()
            loadState()
            running = true
            serverSocket = ServerSocket(port, 50)
            threadPool.execute { acceptLoop() }
            if (botToken != null) threadPool.execute { pollMessages() }
            true
        } catch (e: Exception) {
            android.util.Log.e(TAG, "Start failed", e)
            false
        }
    }

    fun stop() {
        running = false
        serverSocket?.close()
        saveState()
    }

    private fun acceptLoop() {
        while (running) {
            try {
                val client = serverSocket?.accept() ?: continue
                threadPool.execute { handleClient(client) }
            } catch (_: Exception) { break }
        }
    }

    private fun handleClient(socket: Socket) {
        try {
            socket.use { s ->
                val reader = BufferedReader(InputStreamReader(s.getInputStream(), Charsets.UTF_8))
                val requestLine = reader.readLine() ?: return
                val parts = requestLine.split(" ")
                if (parts.size < 2) return
                val method = parts[0].uppercase()
                val fullPath = parts[1]
                val pathOnly = fullPath.split("?").first()
                val queryStr = fullPath.split("?").getOrElse(1) { "" }
                val params = queryStr.split("&").filter { it.isNotBlank() }.associate {
                    val kv = it.split("=", limit = 2)
                    kv[0] to (kv.getOrElse(1) { "" })
                }
                val headers = mutableMapOf<String, String>()
                var line = reader.readLine()
                while (line != null && line.isNotBlank()) {
                    val ci = line.indexOf(':'); if (ci > 0) headers[line.substring(0, ci).trim().lowercase()] = line.substring(ci + 1).trim()
                    line = reader.readLine()
                }
                val contentLen = headers["content-length"]?.toIntOrNull() ?: 0
                val body = if (contentLen > 0) {
                    val buf = CharArray(contentLen); var off = 0
                    while (off < contentLen) { val r = reader.read(buf, off, contentLen - off); if (r == -1) break; off += r }
                    String(buf, 0, off)
                } else ""
                val resp = route(method, pathOnly, params, headers, body)
                val out = s.getOutputStream()
                out.write("HTTP/1.1 ${resp.code} ${resp.reason}\r\n".toByteArray())
                resp.headers.forEach { (k, v) -> out.write("$k: $v\r\n".toByteArray()) }
                out.write("\r\n".toByteArray())
                out.write(resp.body); out.flush()
            }
        } catch (_: Exception) {}
    }

    data class Resp(val code: Int, val reason: String, val headers: Map<String, String>, val body: ByteArray)

    private fun route(method: String, path: String, params: Map<String, String>, headers: Map<String, String>, body: String): Resp {
        val cors = mapOf("Access-Control-Allow-Origin" to "*", "Access-Control-Allow-Methods" to "GET,POST,OPTIONS", "Access-Control-Allow-Headers" to "*")
        if (method == "OPTIONS") return Resp(204, "No Content", cors, ByteArray(0))
        return when {
            path == "/api/qrcode" -> apiGetQrcode(cors)
            path == "/api/qrcode-status" -> apiQrcodeStatus(cors)
            path == "/api/status" -> apiStatus(cors)
            path == "/api/messages" -> apiMessages(params, cors)
            path == "/api/send-text" || path == "/api/send" -> apiSendText(body, cors)
            path == "/api/users" -> apiUsers(cors)
            path == "/api/switch-user" -> apiSwitchUser(body, cors)
            path == "/api/delete-user" -> apiDeleteUser(body, cors)
            path == "/api/debug-log" -> apiDebugLog(body, cors)
            path == "/api/ai-config" && method == "GET" -> apiGetAiConfig(cors)
            path == "/api/ai-config" && method == "POST" -> apiSaveAiConfig(body, cors)
            path == "/api/ai-test" -> apiAiTest(body, cors)
            path == "/api/skills" -> apiSkills(cors)
            path == "/api/personas" && method == "GET" -> apiGetPersonas(cors)
            path == "/api/personas" && method == "POST" -> apiSavePersona(body, cors)
            path == "/api/personas/delete" -> apiDeletePersona(body, cors)
            path == "/api/personas/assign" -> apiAssignPersona(body, cors)
            path == "/api/logout" -> apiLogout(cors)
            path == "/api/add-friend-qrcode" -> apiAddFriendQrcode(cors)
            path == "/api/add-friend-status" -> apiAddFriendStatus(cors)
            path == "/api/add-friend-poll" -> apiAddFriendPoll(cors)
            path == "/api/qrcode-image" -> apiQrcodeImage(cors)
            path.startsWith("/api/media/") -> apiMedia(path, cors)
            path == "/api/send-media" -> apiSendMedia(body, cors)
            else -> serveStatic(path, cors)
        }
    }

    private fun extractWww() {
        if (wwwDir.exists() && File(wwwDir, "index.html").exists()) return
        wwwDir.mkdirs()
        try {
            context.assets.open("www.zip").use { input ->
                val zis = java.util.zip.ZipInputStream(input)
                var entry = zis.nextEntry
                while (entry != null) {
                    val f = File(wwwDir, entry.name)
                    if (entry.isDirectory) f.mkdirs()
                    else { f.parentFile?.mkdirs(); FileOutputStream(f).use { zis.copyTo(it) } }
                    zis.closeEntry(); entry = zis.nextEntry
                }
            }
        } catch (_: Exception) {}
    }

    private val MIME = mapOf("html" to "text/html", "js" to "text/javascript", "css" to "text/css",
        "json" to "application/json", "png" to "image/png", "jpg" to "image/jpeg", "svg" to "image/svg+xml",
        "ico" to "image/x-icon", "woff2" to "font/woff2", "ttf" to "font/ttf")

    private fun serveStatic(path: String, cors: Map<String, String>): Resp {
        val fp = if (path == "/") "index.html" else path.trimStart('/')
        val file = File(wwwDir, fp)
        if (file.exists() && file.isFile) {
            val mime = MIME[file.extension.lowercase()] ?: "application/octet-stream"
            return Resp(200, "OK", cors + mapOf("Content-Type" to mime), file.readBytes())
        }
        val idx = File(wwwDir, "index.html")
        return if (idx.exists()) Resp(200, "OK", cors + mapOf("Content-Type" to "text/html"), idx.readBytes())
        else Resp(404, "Not Found", cors, "Not Found".toByteArray())
    }

    private fun jsonOk(cors: Map<String, String>, data: Any): Resp {
        val json = if (data is JSONObject) data.toString() else (data as JSONArray).toString()
        return Resp(200, "OK", cors + mapOf("Content-Type" to "application/json"), json.toByteArray())
    }

    private fun apiGetQrcode(cors: Map<String, String>): Resp {
        val data = ilinkGet("/ilink/bot/get_bot_qrcode?bot_type=3")
        if (data == null) return jsonOk(cors, JSONObject(mapOf("success" to false)))
        qrKey = data.optString("qrcode", ""); qrStatus = "waiting"
        if (qrKey != null) startQrPolling()
        return jsonOk(cors, JSONObject(mapOf("success" to (qrKey != null), "qrcode_key" to (qrKey?:""), "qrcode_img_url" to data.optString("qrcode_img_content",""))))
    }

    private fun apiQrcodeStatus(cors: Map<String, String>): Resp = jsonOk(cors, JSONObject(mapOf("status" to qrStatus, "connected" to (botToken != null), "bot_id" to (botId?:""))))
    private fun apiStatus(cors: Map<String, String>): Resp = jsonOk(cors, JSONObject(mapOf("connected" to (botToken != null), "bot_id" to (botId?:""))))
    private fun apiQrcodeImage(cors: Map<String, String>): Resp = Resp(200, "OK", cors + mapOf("Content-Type" to "image/svg+xml"), "<svg xmlns='http://www.w3.org/2000/svg' width='280' height='280'><rect fill='white'/><text x='140' y='140' text-anchor='middle' fill='#666' font-size='14'>QR</text></svg>".toByteArray())

    private fun apiMessages(params: Map<String, String>, cors: Map<String, String>): Resp {
        val since = params["since"]?.toIntOrNull() ?: 0
        val uf = params["user"] ?: ""
        val arr = JSONArray()
        messages.filter { it.optInt("id",0) > since && (uf.isEmpty() || it.optString("from","")==uf || it.optString("to","")==uf) }.forEach { arr.put(it) }
        return jsonOk(cors, JSONObject(mapOf("messages" to arr, "current_user" to (contextTokens.keys.firstOrNull()?:""))))
    }

    private fun apiSendText(body: String, cors: Map<String, String>): Resp {
        try {
            val j = JSONObject(body); val text = j.optString("text",""); val uid = j.optString("to_user_id","")
            if (text.isEmpty() || uid.isEmpty()) return jsonOk(cors, JSONObject(mapOf("success" to false, "error" to "Missing fields")))
            val ctx = contextTokens[uid] ?: return jsonOk(cors, JSONObject(mapOf("success" to false, "error" to "No session")))
            val textItem = JSONObject(mapOf("type" to 1, "text_item" to JSONObject(mapOf("text" to text))))
            val msgObj = JSONObject(mapOf(
                "from_user_id" to "", "to_user_id" to uid,
                "client_id" to "msg-${System.currentTimeMillis()}",
                "message_type" to 2, "message_state" to 2,
                "context_token" to ctx,
                "item_list" to JSONArray(listOf(textItem))
            ))
            val r = ilinkPost("sendmessage", JSONObject(mapOf("msg" to msgObj)), botToken ?: "")
            val ok = r?.opt("errcode")==null || r?.optInt("errcode",0)==0
            if (ok && r?.optInt("ret", 0) != -1) messages.add(JSONObject(mapOf("id" to ++msgId, "to" to uid, "text" to text, "time" to System.currentTimeMillis(), "dir" to "out")))
            return jsonOk(cors, JSONObject(mapOf("success" to ok)))
        } catch (_: Exception) { return jsonOk(cors, JSONObject(mapOf("success" to false))) }
    }

    private fun apiUsers(cors: Map<String, String>): Resp = jsonOk(cors, JSONObject(mapOf("users" to JSONArray(contextTokens.keys.toList()), "current_user" to (contextTokens.keys.firstOrNull()?:""))))
    private fun apiSwitchUser(body: String, cors: Map<String, String>): Resp = try { jsonOk(cors, JSONObject(mapOf("success" to true))) } catch (_: Exception) { jsonOk(cors, JSONObject(mapOf("success" to false))) }
    private fun apiDeleteUser(body: String, cors: Map<String, String>): Resp { try { contextTokens.remove(JSONObject(body).optString("user_id","")); saveState() } catch(_:Exception){}; return jsonOk(cors, JSONObject(mapOf("success" to true))) }
    private fun apiDebugLog(body: String, cors: Map<String, String>): Resp { try { val j=JSONObject(body); android.util.Log.w(TAG,"[FE] ${j.optString("msg","")}") } catch(_:Exception){}; return Resp(200,"OK",cors,"ok".toByteArray()) }

    private val aiConfigFile = File(context.filesDir, "ai_config.json")
    private fun loadAiConfig(): JSONObject = try { JSONObject(aiConfigFile.readText()) } catch(_:Exception){ JSONObject() }
    private fun apiGetAiConfig(cors: Map<String, String>): Resp = jsonOk(cors, loadAiConfig())
    private fun apiSaveAiConfig(body: String, cors: Map<String, String>): Resp = try { aiConfigFile.writeText(JSONObject(body).toString(2)); jsonOk(cors, JSONObject(mapOf("success" to true))) } catch(_:Exception){ jsonOk(cors, JSONObject(mapOf("success" to false))) }

    private fun apiAiTest(body: String, cors: Map<String, String>): Resp = try {
        val j=JSONObject(body)
        val r=httpsPost(j.optString("api_url","").trimEnd('/')+"/chat/completions", j.optString("api_key",""), JSONObject(mapOf("model" to j.optString("model","gpt-3.5-turbo"), "messages" to JSONArray(listOf(JSONObject(mapOf("role" to "user", "content" to "回复OK")))), "max_tokens" to 10)).toString())
        if (r!=null) jsonOk(cors, JSONObject(mapOf("success" to true, "reply" to (r.optJSONArray("choices")?.optJSONObject(0)?.optJSONObject("message")?.optString("content","")?:"")?.take(50))))
        else jsonOk(cors, JSONObject(mapOf("success" to false, "error" to "request failed")))
    } catch(_:Exception){ jsonOk(cors, JSONObject(mapOf("success" to false, "error" to "exception"))) }

    private fun apiSkills(cors: Map<String, String>): Resp {
        val s=JSONArray(); val names=listOf("tong-jincheng" to "童锦程思维","crush-push-pull" to "Crush推拉技巧","emotion-detect" to "情绪感知")
        val desc=listOf("深情祖师爷心智模型","暧昧期推拉话术","识别对方情绪状态")
        names.forEachIndexed{i,(id,n)->s.put(JSONObject(mapOf("id" to id,"name" to n,"description" to desc[i],"type" to "thinking"))) }
        return jsonOk(cors, JSONObject(mapOf("skills" to s)))
    }

    private val personaFile = File(context.filesDir, "personas.json")
    private val personaMapFile = File(context.filesDir, "persona_map.json")
    private fun loadPersonas(): JSONObject = try { JSONObject(personaFile.readText()) } catch(_:Exception){ JSONObject() }
    private fun apiGetPersonas(cors: Map<String, String>): Resp {
        val ps=loadPersonas(); val arr=JSONArray(); ps.keys().forEach{arr.put(ps.get(it as String))}
        return jsonOk(cors, JSONObject(mapOf("personas" to arr, "user_map" to (try{JSONObject(personaMapFile.readText())}catch(_:Exception){JSONObject()}))))
    }
    private fun apiSavePersona(body: String, cors: Map<String, String>): Resp = try {
        val d=JSONObject(body); val id=d.optString("id","p_${Date().time.toString(36)}${Random().nextInt(9999)}")
        d.put("id",id); d.put("createdAt",System.currentTimeMillis())
        val ps=loadPersonas(); ps.put(id,d); personaFile.writeText(ps.toString(2))
        jsonOk(cors, JSONObject(mapOf("success" to true, "id" to id)))
    } catch(_:Exception){ jsonOk(cors, JSONObject(mapOf("success" to false))) }
    private fun apiDeletePersona(body: String, cors: Map<String, String>): Resp = try {
        val id=JSONObject(body).optString("id",""); val ps=loadPersonas(); ps.remove(id); personaFile.writeText(ps.toString(2))
        val map=try{JSONObject(personaMapFile.readText())}catch(_:Exception){JSONObject()}
        val rm=mutableListOf<String>(); map.keys().forEach{if(map.optString(it as String,"")==id) rm.add(it)}; rm.forEach{map.remove(it)}; personaMapFile.writeText(map.toString(2))
        jsonOk(cors, JSONObject(mapOf("success" to true)))
    } catch(_:Exception){ jsonOk(cors, JSONObject(mapOf("success" to false))) }
    private fun apiAssignPersona(body: String, cors: Map<String, String>): Resp = try {
        val j=JSONObject(body); val uid=j.optString("user_id",""); val pid=j.optString("persona_id","")
        val map=try{JSONObject(personaMapFile.readText())}catch(_:Exception){JSONObject()}
        if(pid.isEmpty()) map.remove(uid) else map.put(uid,pid); personaMapFile.writeText(map.toString(2))
        jsonOk(cors, JSONObject(mapOf("success" to true)))
    } catch(_:Exception){ jsonOk(cors, JSONObject(mapOf("success" to false))) }

    private fun apiLogout(cors: Map<String, String>): Resp {
        botToken=null; botId=null; cursor=""; qrKey=null; qrStatus="idle"
        contextTokens.clear(); messages.clear(); msgId=0; processedMsgIds.clear(); saveState()
        return jsonOk(cors, JSONObject(mapOf("success" to true)))
    }

    private var afKey:String?=null; private var afStatus="idle"
    private fun apiAddFriendQrcode(cors: Map<String, String>): Resp {
        val d=ilinkGet("/ilink/bot/get_bot_qrcode?bot_type=3")
        if(d==null) return jsonOk(cors, JSONObject(mapOf("success" to false)))
        afKey=d.optString("qrcode",""); afStatus="waiting"
        if(afKey!=null) threadPool.execute{ while(afKey!=null&&afStatus!="confirmed"){ try{val r=ilinkGet("/ilink/bot/get_qrcode_status?qrcode=$afKey&iLink-App-ClientVersion=1"); if(r!=null){val st=r.optString("status",""); if(st=="confirmed"){afStatus="confirmed";break}else if(st=="expired"){afStatus="expired";break}} }catch(_:Exception){}; Thread.sleep(2000)} }
        return jsonOk(cors, JSONObject(mapOf("success" to true)))
    }
    private fun apiAddFriendStatus(cors: Map<String, String>): Resp = jsonOk(cors, JSONObject(mapOf("status" to afStatus)))
    private fun apiAddFriendPoll(cors: Map<String, String>): Resp = jsonOk(cors, JSONObject(mapOf("status" to afStatus)))

    private val mediaCacheDir = File(context.filesDir, "media_cache")
    private fun apiMedia(path: String, cors: Map<String, String>): Resp {
        val key=path.split("/").getOrNull(3) ?: ""
        val f=File(mediaCacheDir, "$key.img")
        if(f.exists()) return Resp(200,"OK",cors+mapOf("Content-Type" to "image/jpeg"), f.readBytes())
        return Resp(404,"Not Found",cors, ByteArray(0))
    }
    private fun apiSendMedia(body: String, cors: Map<String, String>): Resp = jsonOk(cors, JSONObject(mapOf("success" to false, "error" to "not implemented")))

    private fun ilinkGet(path: String): JSONObject? = try {
        val conn=URL("https://$ILINK_HOST$path").openConnection() as HttpsURLConnection
        conn.connectTimeout=15000; conn.readTimeout=15000; conn.setRequestProperty("Content-Type","application/json")
        JSONObject(conn.inputStream.readBytes().decodeToString())
    } catch(_:Exception){ null }

    private fun ilinkPost(endpoint: String, body: JSONObject, token: String): JSONObject? = try {
        body.put("base_info", JSONObject(mapOf("channel_version" to "1.0.3")))
        val url=URL("https://$ILINK_HOST/ilink/bot/$endpoint")
        val conn=url.openConnection() as HttpsURLConnection
        conn.doOutput=true; conn.connectTimeout=25000; conn.readTimeout=25000
        conn.setRequestProperty("Content-Type","application/json"); conn.setRequestProperty("AuthorizationType","ilink_bot_token")
        conn.setRequestProperty("Authorization","Bearer $token")
        conn.setRequestProperty("X-WECHAT-UIN", Base64.getEncoder().encodeToString(Random().nextInt().toString().toByteArray()))
        conn.outputStream.write(body.toString().toByteArray())
        JSONObject(conn.inputStream.readBytes().decodeToString())
    } catch(_:Exception){ null }

    private fun httpsPost(urlStr: String, apiKey: String, jsonBody: String): JSONObject? = try {
        val conn=URL(urlStr).openConnection() as HttpsURLConnection
        conn.doOutput=true; conn.connectTimeout=30000; conn.readTimeout=30000
        conn.setRequestProperty("Content-Type","application/json")
        conn.setRequestProperty("Authorization","Bearer $apiKey")
        conn.outputStream.write(jsonBody.toByteArray())
        JSONObject(conn.inputStream.readBytes().decodeToString())
    } catch(_:Exception){ null }

    private var pollingQr=false
    private fun startQrPolling() { if(pollingQr)return; pollingQr=true
        threadPool.execute{ while(pollingQr && botToken==null){
            try{val d=ilinkGet("/ilink/bot/get_qrcode_status?qrcode=${qrKey?:""}&iLink-App-ClientVersion=1")
                if(d!=null){val st=d.optString("status","")
                    if(st=="scaned") qrStatus="scaned"
                    else if(st=="confirmed"){qrStatus="confirmed";botToken=d.optString("bot_token","");botId=d.optString("ilink_bot_id","");saveState();pollingQr=false;pollingMsg=true;threadPool.execute{ pollMessages() };return@execute}
                    else if(st=="expired"){qrStatus="expired";pollingQr=false;return@execute} }
            }catch(_:Exception){}; Thread.sleep(2000) }; pollingQr=false } }

    private var pollingMsg=false
    private fun pollMessages() {
        while(pollingMsg && botToken!=null){
            try{val r=ilinkPost("getupdates", JSONObject(mapOf("get_updates_buf" to cursor)), botToken?:""); if(r!=null && r.optInt("ret",0)!=-1){
                if(r.has("get_updates_buf")) cursor=r.optString("get_updates_buf","")
                val msgs=r.optJSONArray("msgs")?:JSONArray()
                for(i in 0 until msgs.length()){val m=msgs.getJSONObject(i); val fu=m.optString("from_user_id",""); val ct=m.optString("context_token","")
                    if(fu.isNotEmpty()&&ct.isNotEmpty()&&!contextTokens.containsKey(fu)){contextTokens[fu]=ct;saveState()}
                    val items=m.optJSONArray("item_list")?:JSONArray()
                    for(j in 0 until items.length()){val item=items.getJSONObject(j)
                        if(item.optInt("type",0)==1){val text=item.optJSONObject("text_item")?.optString("text","")?:""; val mid=m.optString("id","")
                            if(text.isNotEmpty()&&mid.isNotEmpty()&&!processedMsgIds.contains(mid)){processedMsgIds.add(mid);messages.add(JSONObject(mapOf("id" to ++msgId,"from" to fu,"text" to text,"time" to System.currentTimeMillis(),"dir" to "in"))); if(text.isNotEmpty()&&fu.isNotEmpty()) autoReply(fu,text)} } } }
            }}catch(_:Exception){}; try{Thread.sleep(2000)}catch(_:Exception){break} }
        pollingMsg=false
    }

    private val autoReplyCounts=mutableMapOf<String,Int>()
    private fun autoReply(toUser: String, userMsg: String) {
        try{val cfg=loadAiConfig(); if(!cfg.optBoolean("enabled",false)||!cfg.has("api_url")||!cfg.has("api_key"))return
            val ctx=contextTokens[toUser]?:return; val rk="$toUser:$userMsg"
            val cnt=(autoReplyCounts[rk]?:0)+1; autoReplyCounts[rk]=cnt; if(cnt>(cfg.optInt("max_replies",2)))return
            var prompt=cfg.optString("prompt","你是微信上的一个真实好友。"); val pMap=try{JSONObject(personaMapFile.readText())}catch(_:Exception){JSONObject()}
            val pid=pMap.optString(toUser,""); if(pid.isNotEmpty()){val ps=loadPersonas().optJSONObject(pid); if(ps!=null)prompt=buildPersonaPrompt(ps)}
            val req=JSONObject(mapOf("model" to cfg.optString("model","gpt-3.5-turbo"), "messages" to JSONArray(listOf(JSONObject(mapOf("role" to "system","content" to prompt)), JSONObject(mapOf("role" to "user","content" to userMsg))))))
            val mt=cfg.optInt("token_limit",0); if(mt>0)req.put("max_tokens",mt)
            val r=httpsPost(cfg.optString("api_url","").trimEnd('/')+"/chat/completions", cfg.optString("api_key",""), req.toString())?:return
            var reply=r.optJSONArray("choices")?.optJSONObject(0)?.optJSONObject("message")?.optString("content","")?:return
            val mc=cfg.optInt("reply_max_chars",0); if(mc>0&&reply.length>mc)reply=reply.take(mc)
            val replyItem = JSONObject(mapOf("type" to 1, "text_item" to JSONObject(mapOf("text" to reply))))
            val replyMsg = JSONObject(mapOf(
                "from_user_id" to "", "to_user_id" to toUser,
                "client_id" to "ai-${Date().time.toString(36)}",
                "message_type" to 2, "message_state" to 2,
                "context_token" to ctx,
                "item_list" to JSONArray(listOf(replyItem))
            ))
            ilinkPost("sendmessage", JSONObject(mapOf("msg" to replyMsg)), botToken ?: "")
            messages.add(JSONObject(mapOf("id" to ++msgId, "to" to toUser, "text" to reply, "time" to System.currentTimeMillis(), "dir" to "out")))
        }catch(_:Exception){} }

    private fun buildPersonaPrompt(p: JSONObject): String = buildString{
        append("【你的身份和表达方式】\n名称：${p.optString("name","")}\n")
        if(p.has("personality"))append("\n性格：${p.optString("personality","")}\n")
        if(p.has("style"))append("\n说话风格：${p.optString("style","")}\n")
        if(p.has("background"))append("\n背景：${p.optString("background","")}\n")
        if(p.has("details"))append("\n其他：${p.optString("details","")}\n") }

    private fun loadState() {
        try{val j=JSONObject(stateFile.readText())
            if(j.has("botToken"))botToken=j.optString("botToken","")
            if(j.has("botId"))botId=j.optString("botId","")
            if(j.has("cursor"))cursor=j.optString("cursor","")
            val t=j.optJSONObject("contextTokens"); if(t!=null)t.keys().forEach{contextTokens[it as String]=t.optString(it,"")}
            val m=j.optJSONArray("messages"); if(m!=null)for(i in 0 until m.length())messages.add(m.getJSONObject(i))
            msgId=j.optInt("msgId",0)
        }catch(_:Exception){} }

    private fun saveState() {
        try{val m=JSONArray(); messages.forEach{m.put(it)}; val t=JSONObject(); contextTokens.forEach{(k,v)->t.put(k,v)}
            val j=JSONObject(); if(botToken!=null)j.put("botToken",botToken); if(botId!=null)j.put("botId",botId); if(cursor.isNotEmpty())j.put("cursor",cursor)
            j.put("contextTokens",t); j.put("messages",m); j.put("msgId",msgId); stateFile.writeText(j.toString(2))
        }catch(_:Exception){} }
}
