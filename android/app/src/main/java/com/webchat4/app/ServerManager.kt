package com.webchat4.app

import android.content.Context
import android.util.Log
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.zip.ZipInputStream

class ServerManager(private val context: Context) {
    companion object {
        private const val TAG = "WebChat4"
        private const val PORT = 3001
    }

    private var serverProcess: Process? = null

    // Android 16 禁止从 filesDir 执行二进制，用 app 数据根目录
    private val workDir: File by lazy {
        val d = File(context.applicationInfo.dataDir, "app")
        d.mkdirs()
        d
    }
    private val nodeFile = File(workDir, "node-arm64")
    private val libDir = File(workDir, "lib")
    private val serverDir = File(workDir, "server")
    private val statusFile = File(workDir, "status.txt")

    private fun saveStatus(msg: String) {
        try { statusFile.writeText(msg) } catch (_: Throwable) {}
    }

    fun isRunning(): Boolean = serverProcess?.isAlive == true

    fun startServer(callback: (Boolean) -> Unit) {
        Thread {
            try {
                // 1. 解压 Node.js 二进制
                if (!nodeFile.exists()) {
                    saveStatus("解压 Node.js...")
                    context.assets.open("node-arm64").use { src ->
                        FileOutputStream(nodeFile).use { src.copyTo(it) }
                    }
                    nodeFile.setExecutable(true)
                    saveStatus("Node.js OK (${nodeFile.length()} bytes)")
                }

                if (!nodeFile.canExecute()) {
                    saveStatus("错误: Node.js 不能执行")
                    callback(false); return@Thread
                }

                // 2. 解压服务端代码
                if (!File(serverDir, "server/server.cjs").exists()) {
                    saveStatus("解压服务端代码...")
                    context.assets.open("server.zip").use { input ->
                        val zis = ZipInputStream(input)
                        var entry = zis.nextEntry
                        while (entry != null) {
                            val outFile = File(workDir, entry.name)
                            if (entry.isDirectory) {
                                outFile.mkdirs()
                            } else {
                                outFile.parentFile?.mkdirs()
                                FileOutputStream(outFile).use { fout ->
                                    val buf = ByteArray(8192); var r: Int
                                    while (zis.read(buf).also { r = it } != -1) fout.write(buf, 0, r)
                                }
                            }
                            zis.closeEntry()
                            entry = zis.nextEntry
                        }
                    }
                    saveStatus("服务端代码 OK")
                }

                // 3. 提取 Termux 依赖库
                if (!libDir.exists()) {
                    try {
                        val libAssets = context.assets.list("lib")
                        if (libAssets != null && libAssets.isNotEmpty()) {
                            libDir.mkdirs()
                            for (fn in libAssets) {
                                try {
                                    context.assets.open("lib/$fn").use { src ->
                                        FileOutputStream(File(libDir, fn)).use { src.copyTo(it) }
                                    }
                                } catch (_: Exception) {}
                            }
                            saveStatus("依赖库: ${libAssets.size} 个")
                        }
                    } catch (_: Exception) {}
                }

                // 4. 通过系统 linker64 执行（Android 16 限制解决）
                saveStatus("启动服务器...")
                val serverJs = File(serverDir, "server/server.cjs").absolutePath
                val nodePath = nodeFile.absolutePath

                // 通过系统 linker64 执行（绕过 Android noexec 限制）
                val libPath = "${libDir.absolutePath}:/system/lib64:/vendor/lib64"
                val cmd = arrayOf("/system/bin/linker64", nodePath, serverJs)
                val pb = ProcessBuilder(*cmd)
                pb.environment()["NODE_ENV"] = "production"
                pb.environment()["LD_LIBRARY_PATH"] = libPath
                pb.directory(File(serverDir, "server"))
                pb.redirectErrorStream(true)

                serverProcess = pb.start()

                // 4. 等待端口
                saveStatus("等待端口 $PORT...")
                val start = System.currentTimeMillis()
                var ready = false
                while (System.currentTimeMillis() - start < 15000) {
                    try {
                        val conn = URL("http://127.0.0.1:$PORT").openConnection() as HttpURLConnection
                        conn.connectTimeout = 400
                        try {
                            if (conn.responseCode in 200..499) { ready = true; break }
                        } finally { conn.disconnect() }
                    } catch (_: Exception) {}
                    Thread.sleep(200)
                }

                if (ready) {
                    saveStatus("服务器就绪!")
                    callback(true)
                } else {
                    val alive = serverProcess?.isAlive == true
                    val code = if (!alive) (serverProcess?.exitValue() ?: -1) else -1
                    saveStatus("超时 (存活:$alive 退出码:$code)")
                    callback(false)
                }
            } catch (e: Exception) {
                saveStatus("启动失败: ${e.message}")
                callback(false)
            }
        }.start()
    }

    fun stopServer() {
        serverProcess?.destroyForcibly()
        serverProcess = null
    }
}
