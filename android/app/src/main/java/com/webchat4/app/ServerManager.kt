package com.webchat4.app

import android.content.Context
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.zip.ZipInputStream

class ServerManager(private val context: Context) {
    companion object {
        private const val PORT = 3001
    }

    private var serverProcess: Process? = null
    var lastError: String = ""

    // 直接放 dataDir 根目录，不走 filesDir（Android 16 noexec）
    private val workDir: File by lazy {
        val d = File(context.applicationInfo.dataDir, "app")
        d.mkdirs()
        d
    }
    private val nodeFile = File(workDir, "node-arm64")
    private val libDir = File(workDir, "lib")
    private val serverDir = File(workDir, "server")

    fun isRunning(): Boolean = serverProcess?.isAlive == true

    fun startServer(callback: (Boolean) -> Unit) {
        Thread {
            try {
                // 1. 解压 node
                if (!nodeFile.exists()) {
                    context.assets.open("node-arm64").use { src ->
                        FileOutputStream(nodeFile).use { src.copyTo(it) }
                    }
                    nodeFile.setExecutable(true)
                }

                // 2. 解压依赖库
                if (!libDir.exists()) {
                    try {
                        val libs = context.assets.list("lib")
                        if (libs != null && libs.isNotEmpty()) {
                            libDir.mkdirs()
                            for (fn in libs) {
                                try {
                                    context.assets.open("lib/$fn").use { src ->
                                        FileOutputStream(File(libDir, fn)).use { src.copyTo(it) }
                                    }
                                } catch (_: Exception) {}
                            }
                        }
                    } catch (_: Exception) {}
                }

                // 3. 解压 server 代码
                if (!File(serverDir, "server/server.cjs").exists()) {
                    context.assets.open("server.zip").use { input ->
                        val zis = ZipInputStream(input)
                        var entry = zis.nextEntry
                        while (entry != null) {
                            val outFile = File(workDir, entry.name)
                            if (entry.isDirectory) outFile.mkdirs()
                            else {
                                outFile.parentFile?.mkdirs()
                                FileOutputStream(outFile).use { fout ->
                                    val b = ByteArray(8192); var r: Int
                                    while (zis.read(b).also { r = it } != -1) fout.write(b, 0, r)
                                }
                            }
                            zis.closeEntry()
                            entry = zis.nextEntry
                        }
                    }
                }

                // 4. 通过 system linker64 执行
                val serverJs = File(serverDir, "server/server.cjs").absolutePath
                val nodePath = nodeFile.absolutePath
                val libPath = "${libDir.absolutePath}:/system/lib64:/vendor/lib64"

                val pb = ProcessBuilder("/system/bin/linker64", nodePath, serverJs)
                pb.environment()["NODE_ENV"] = "production"
                pb.environment()["LD_LIBRARY_PATH"] = libPath
                pb.directory(File(serverDir, "server"))
                pb.redirectErrorStream(true)

                serverProcess = pb.start()

                // 等待端口
                val start = System.currentTimeMillis()
                var ready = false
                while (System.currentTimeMillis() - start < 30000) {
                    try {
                        val conn = URL("http://127.0.0.1:$PORT").openConnection() as HttpURLConnection
                        conn.connectTimeout = 500
                        try {
                            if (conn.responseCode in 200..499) { ready = true; break }
                        } finally { conn.disconnect() }
                    } catch (_: Exception) {}
                    Thread.sleep(200)
                }

                if (ready) {
                    callback(true)
                    return@Thread
                }

                val alive = serverProcess?.isAlive == true
                val code = if (!alive) (serverProcess?.exitValue() ?: -1) else -1
                lastError = "超时(存活:$alive 退出码:$code)"

                // 取进程输出
                if (!alive) {
                    try {
                        lastError += "\n" + (serverProcess?.inputStream?.bufferedReader()?.readText() ?: "").take(2000)
                    } catch (_: Exception) {}
                }

                callback(false)

            } catch (e: Exception) {
                lastError = "${e.message}"
                callback(false)
            }
        }.start()
    }

    fun stopServer() {
        serverProcess?.destroyForcibly()
        serverProcess = null
    }
}
