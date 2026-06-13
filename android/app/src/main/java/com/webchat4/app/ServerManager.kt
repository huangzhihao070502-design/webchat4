package com.webchat4.app

import android.content.Context
import android.util.Log
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL

class ServerManager(private val context: Context) {
    companion object {
        private const val TAG = "ServerManager"
        private const val PORT = 3001
    }

    private var serverProcess: Process? = null

    private val filesDir: File get() = context.filesDir
    private val rootfsDir: File get() = File(filesDir, "rootfs")
    private val prootFile: File get() = File(filesDir, "proot-arm64")

    fun isRunning(): Boolean = serverProcess?.isAlive == true

    fun startServer(callback: (Boolean) -> Unit) {
        Thread {
            try {
                // Extract rootfs if needed
                if (!rootfsDir.exists()) {
                    Log.i(TAG, "Extracting rootfs...")
                    extractTarGzAsset("rootfs.tar.gz", filesDir.absolutePath)
                    Log.i(TAG, "Rootfs extracted")
                }

                // Extract proot if needed
                if (!prootFile.exists()) {
                    Log.i(TAG, "Extracting proot...")
                    copyAsset("proot-arm64", prootFile)
                    prootFile.setExecutable(true)
                    Log.i(TAG, "Proot extracted")
                }

                // Start server
                Log.i(TAG, "Starting Node.js server via PRoot...")
                val pb = ProcessBuilder(
                    prootFile.absolutePath,
                    "-r", rootfsDir.absolutePath,
                    "-b", "/dev",
                    "-b", "/proc",
                    "-b", "/sys",
                    "--kill-on-exit",
                    "-w", "/home/webchat4",
                    "/usr/bin/node", "/home/webchat4/server/server.cjs"
                )
                pb.environment()["HOME"] = "/home/webchat4"
                pb.environment()["NODE_ENV"] = "production"
                pb.directory(rootfsDir)
                pb.redirectErrorStream(true)

                serverProcess = pb.start()

                // Read output in background
                Thread {
                    try {
                        serverProcess?.inputStream?.bufferedReader()?.use { reader ->
                            reader.lines().forEach { line ->
                                Log.d(TAG, "[SERVER] $line")
                            }
                        }
                    } catch (e: Exception) { }
                }.start()

                waitForServer(10000)
                callback(true)
            } catch (e: Exception) {
                Log.e(TAG, "Server start failed", e)
                callback(false)
            }
        }.start()
    }

    private fun waitForServer(timeoutMs: Long) {
        val start = System.currentTimeMillis()
        while (System.currentTimeMillis() - start < timeoutMs) {
            try {
                val conn = URL("http://127.0.0.1:$PORT").openConnection() as HttpURLConnection
                conn.connectTimeout = 500
                conn.readTimeout = 500
                try {
                    if (conn.responseCode in 200..499) return
                } finally { conn.disconnect() }
            } catch (_: Exception) { }
            Thread.sleep(200)
        }
    }

    private fun extractTarGzAsset(assetName: String, destPath: String) {
        context.assets.open(assetName).use { input ->
            val tmpFile = File(filesDir, "rootfs.tar.gz")
            FileOutputStream(tmpFile).use { input.copyTo(it) }
            val process = ProcessBuilder("tar", "xzf", tmpFile.absolutePath, "-C", destPath)
                .start()
            process.waitFor()
            tmpFile.delete()
        }
    }

    private fun copyAsset(assetName: String, destFile: File) {
        context.assets.open(assetName).use { input ->
            FileOutputStream(destFile).use { input.copyTo(it) }
        }
    }

    fun stopServer() {
        serverProcess?.destroyForcibly()
        serverProcess = null
    }
}
