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

    // 使用 cacheDir 代替 filesDir（Android 16 更稳定）
    private val workDir: File = context.cacheDir
    private val rootfsDir: File = File(workDir, "rootfs")
    private val prootFile: File = File(workDir, "proot-arm64")
    private val logFile: File = File(workDir, "startup.log")

    init {
        // 清理旧日志，初始化日志
        try { logFile.delete() } catch (_: Throwable) {}
        log("=== WebChat4 启动日志 ===")
        log("workDir: ${workDir.absolutePath}")
        log("空间: ${workDir.freeSpace / 1024 / 1024} MB 可用")
    }

    private fun log(msg: String) {
        val line = "[${java.text.SimpleDateFormat("HH:mm:ss.SSS", java.util.Locale.CHINA).format(java.util.Date())}] $msg"
        Log.i(TAG, line)
        try {
            FileOutputStream(logFile, true).use { it.write("$line\n".toByteArray()); it.flush() }
        } catch (e: Throwable) {
            Log.e(TAG, "写日志失败: ${e.message}")
        }
    }

    private fun logError(msg: String, e: Throwable? = null) {
        val stack = if (e != null) "\n${Log.getStackTraceString(e)}" else ""
        log("错误: $msg$stack")
    }

    fun isRunning(): Boolean = serverProcess?.isAlive == true

    fun startServer(callback: (Boolean) -> Unit) {
        Thread {
            try {
                // 步骤1: 解压 rootfs
                if (!rootfsDir.exists()) {
                    log("解压 rootfs.zip...")
                    val start = System.currentTimeMillis()
                    extractZip("rootfs.zip", workDir.absolutePath)
                    log("解压完成 (${System.currentTimeMillis() - start}ms)")
                } else {
                    log("rootfs 已存在: ${rootfsDir.absolutePath}")
                }

                // 验证 Node.js
                val nodeFile = File(rootfsDir, "usr/bin/node")
                if (!nodeFile.exists()) {
                    logError("未找到 Node.js (${nodeFile.absolutePath})")
                    log("rootfs 内容: ${rootfsDir.list()?.take(20)?.joinToString(", ") ?: "空"}")
                    callback(false); return@Thread
                }
                log("Node.js: ${nodeFile.length()} bytes")

                // 步骤2: 解压 proot
                if (!prootFile.exists()) {
                    log("解压 proot-arm64...")
                    copyAsset("proot-arm64", prootFile)
                    prootFile.setExecutable(true)
                }
                if (!prootFile.canExecute()) {
                    logError("proot 不可执行")
                    callback(false); return@Thread
                }
                log("proot: ${prootFile.length()} bytes")

                // 步骤3: 尝试直接运行 node（不用 PRoot，看能不能跑）
                log("尝试直接运行 node...")
                val directTest = try {
                    val pb = ProcessBuilder("/system/bin/sh", "-c", "echo test123")
                    val p = pb.start()
                    val out = p.inputStream.bufferedReader().readText().trim()
                    p.waitFor()
                    out
                } catch (e: Exception) {
                    logError("shell 测试失败", e)
                    ""
                }
                log("shell 测试: $directTest")

                // 步骤4: 启动 Node.js 服务器（先用 PRoot，不行就换方案）
                log("通过 PRoot 启动 Node.js...")
                val pb = ProcessBuilder(
                    prootFile.absolutePath,
                    "-r", rootfsDir.absolutePath,
                    "-b", "/dev",
                    "-w", "/home/webchat4",
                    "/usr/bin/node", "/home/webchat4/server/server.cjs"
                )
                pb.environment()["HOME"] = "/home/webchat4"
                pb.environment()["NODE_ENV"] = "production"
                pb.directory(rootfsDir)
                pb.redirectErrorStream(true)

                serverProcess = pb.start()

                // 读取进程输出
                Thread {
                    try {
                        serverProcess?.inputStream?.bufferedReader()?.use { reader ->
                            reader.lines().forEach { line -> log("[NODE] $line") }
                        }
                    } catch (_: Exception) {}
                }.start()

                // 等待服务器启动
                val started = waitForServer(15000)
                if (started) {
                    log("服务器启动成功!")
                    callback(true)
                } else {
                    val alive = serverProcess?.isAlive == true
                    val exitCode = if (!alive) serverProcess?.exitValue() else -1
                    logError("服务器超时 - 进程存活: $alive, 退出码: $exitCode")
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
        val fileSize = try { context.assets.open(assetName).available() } catch (_: Exception) { -1 }
        log("开始解压 $assetName ($fileSize bytes) → $destPath")

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
                    outFile.parentFile.mkdirs()
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
            log("解压完成: $count 个文件")
        }
    }

    private fun copyAsset(assetName: String, destFile: File) {
        context.assets.open(assetName).use { input ->
            FileOutputStream(destFile).use { output ->
                input.copyTo(output)
            }
        }
    }

    fun stopServer() {
        serverProcess?.destroyForcibly()
        serverProcess = null
        log("服务已停止")
    }
}
