package com.webchat4.app

import android.content.Context
import android.util.Log
import java.io.BufferedReader
import java.io.File
import java.io.FileOutputStream
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.util.zip.ZipInputStream

class ServerManager(private val context: Context) {
    companion object {
        private const val TAG = "WebChat4"
        private const val PORT = 3001
    }

    private var serverProcess: Process? = null

    // 安全获取可用目录
    private val workDir: File = try {
        var dir = context.cacheDir
        if (dir == null || !dir.exists()) dir = context.filesDir
        if (dir == null || !dir.exists()) {
            val dataDir = context.applicationInfo?.dataDir
            if (dataDir != null) File(dataDir, "cache") else null
        }
        if (dir == null) {
            dir = File("/data/data/${context.packageName}/cache")
        }
        dir?.apply { if (!exists()) mkdirs() }
        dir ?: File(".")
    } catch (e: Throwable) {
        File(".")
    }
    private val rootfsDir = File(workDir, "rootfs")
    private val prootFile = File(workDir, "proot-arm64")
    private val logFile = File(workDir, "startup.log")

    init {
        try {
            logFile.parentFile?.mkdirs()
            logFile.delete()
        } catch (_: Throwable) {}
        // 不要在 init 中写日志，防止构造时崩溃
    }

    private fun log(msg: String) = writeLog(msg)
    private fun logError(msg: String, e: Throwable? = null) {
        val stack = if (e != null) Log.getStackTraceString(e) else ""
        writeLog("错误: $msg")
        if (stack.isNotEmpty()) writeLog(stack.take(2000))
    }

    private fun writeLog(msg: String) {
        val line = "[${System.currentTimeMillis() % 100000}] $msg"
        Log.i(TAG, line)
        try {
            FileOutputStream(logFile, true).use {
                it.write("$line\n".toByteArray())
                it.flush()
            }
        } catch (e: Throwable) {
            Log.e(TAG, "日志写入失败: ${e.message}")
        }
    }

    fun isRunning(): Boolean = serverProcess?.isAlive == true

    fun startServer(callback: (Boolean) -> Unit) {
        Thread {
            try {
                // === 解压 rootfs ===
                if (!rootfsDir.exists()) {
                    log("解压 rootfs.zip...")
                    val t = System.currentTimeMillis()
                    extractZip("rootfs.zip", workDir.absolutePath)
                    log("解压完成 (${System.currentTimeMillis() - t}ms)")
                }

                // 验证 Node.js
                val nodeFile = File(rootfsDir, "usr/bin/node")
                if (!nodeFile.exists()) {
                    logError("Node.js 未找到")
                    // 列出 rootfs 顶层目录
                    val listing = rootfsDir.list()?.take(30)?.joinToString(", ") ?: "空目录"
                    log("rootfs 顶层: $listing")
                    callback(false)
                    return@Thread
                }
                log("Node.js: ${nodeFile.length()} 字节")

                // === 解压 proot ===
                if (!prootFile.exists()) {
                    log("解压 proot...")
                    context.assets.open("proot-arm64").use { input ->
                        FileOutputStream(prootFile).use { input.copyTo(it) }
                    }
                    prootFile.setExecutable(true)
                    log("proot: ${prootFile.length()} 字节")
                }

                if (!prootFile.canExecute()) {
                    logError("proot 不能执行")
                    try {
                        val rt = Runtime.getRuntime()
                        rt.exec("chmod 0755 ${prootFile.absolutePath}").waitFor()
                        log("chmod 重试后: ${prootFile.setExecutable(true)}")
                    } catch (e: Exception) {
                        logError("chmod 失败", e)
                    }
                }

                // === 启动 Node.js ===
                log("启动 PRoot + Node.js...")
                val cmd = arrayOf(
                    prootFile.absolutePath,
                    "-r", rootfsDir.absolutePath,
                    "-b", "/dev",
                    "-b", "/proc",
                    "-b", "/sys",
                    "--kill-on-exit",
                    "-w", "/home/webchat4",
                    "/usr/bin/node", "/home/webchat4/server/server.cjs"
                )
                log("命令: ${cmd.joinToString(" ")}")

                val pb = ProcessBuilder(*cmd)
                pb.environment()["HOME"] = "/home/webchat4"
                pb.environment()["NODE_ENV"] = "production"
                pb.directory(rootfsDir)
                pb.redirectErrorStream(true)

                serverProcess = pb.start()

                // 读取输出
                Thread {
                    try {
                        serverProcess?.inputStream?.bufferedReader()?.use { reader ->
                            reader.lines().forEach { line -> log("[NODE] $line") }
                        }
                    } catch (_: Exception) {}
                }.start()

                // 等待服务器就绪
                log("等待端口 $PORT...")
                if (waitForServer(15000)) {
                    log("服务器就绪!")
                    callback(true)
                } else {
                    val alive = serverProcess?.isAlive == true
                    val exitCode = if (!alive) (serverProcess?.exitValue() ?: -1) else -1
                    logError("超时 (进程存活: $alive, 退出码: $exitCode)")
                    if (!alive && exitCode >= 0) {
                        // 进程已退出，读取错误输出
                        try {
                            val err = serverProcess?.inputStream?.bufferedReader()?.readText() ?: ""
                            log("进程输出:\n${err.take(2000)}")
                        } catch (_: Exception) {}
                    }
                    callback(false)
                }
            } catch (e: Exception) {
                logError("启动异常", e)
                callback(false)
            }
        }.start()
    }

    private fun waitForServer(timeoutMs: Long): Boolean {
        val start = System.currentTimeMillis()
        while (System.currentTimeMillis() - start < timeoutMs) {
            try {
                val conn = URL("http://127.0.0.1:$PORT").openConnection() as HttpURLConnection
                conn.connectTimeout = 400
                conn.readTimeout = 400
                try {
                    if (conn.responseCode in 200..499) return true
                } finally { conn.disconnect() }
            } catch (_: Exception) { }
            Thread.sleep(200)
        }
        return false
    }

    private fun extractZip(assetName: String, destPath: String) {
        val assetSize = try { context.assets.open(assetName).available() } catch (_: Exception) { -1 }
        log("asset $assetName = ${assetSize}bytes")

        context.assets.open(assetName).use { input ->
            val zis = ZipInputStream(input)
            var entry = zis.nextEntry
            var count = 0
            val buf = ByteArray(8192)

            while (entry != null) {
                val outFile = File(destPath, entry.name)
                if (entry.isDirectory) {
                    outFile.mkdirs()
                } else {
                    outFile.parentFile?.mkdirs()
                    FileOutputStream(outFile).use { fout ->
                        var read: Int
                        while (zis.read(buf).also { read = it } != -1) {
                            fout.write(buf, 0, read)
                        }
                    }
                }
                zis.closeEntry()
                count++
                entry = zis.nextEntry
            }
            log("解压了 $count 个文件")
        }
    }

    fun stopServer() {
        serverProcess?.destroyForcibly()
        serverProcess = null
        log("已停止")
    }
}
