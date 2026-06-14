package com.webchat4.app

import android.os.Bundle
import android.view.Gravity
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import java.io.File

class MainActivity : AppCompatActivity() {
    private var serverManager: ServerManager? = null
    private var webView: WebView? = null
    private var errorView: TextView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webview)
        errorView = TextView(this).apply {
            textSize = 12f
            isScrollbarFadingEnabled = false
            setTextIsSelectable(true)
            setPadding(32, 32, 32, 32)
            gravity = Gravity.START
            text = "正在启动服务..."
            (this.parent as? android.view.ViewGroup)?.let { parent ->
                parent.removeView(this)
            }
            addContentView(this, android.view.ViewGroup.LayoutParams(
                android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                android.view.ViewGroup.LayoutParams.MATCH_PARENT
            ))
            bringToFront()
        }
        setupWebView()

        // 尝试写一个测试日志
        try {
            File(cacheDir, "webchat4_test.log").writeText("test ok")
        } catch (e: Exception) {
            showError("无法写入缓存目录: ${e.message}")
            return
        }

        serverManager = ServerManager(this)
        serverManager!!.startServer { success ->
            runOnUiThread {
                if (success) {
                    loadWebApp()
                } else {
                    // 读取日志显示在屏幕上
                    val logText = try {
                        File(cacheDir, "startup.log").readText()
                    } catch (e: Exception) {
                        "无法读取日志: ${e.message}"
                    }
                    showError("服务器启动失败\n\n详细日志:\n$logText")
                }
            }
        }
    }

    private fun showError(msg: String) {
        errorView?.text = msg
        errorView?.setTextColor(0xFFCC0000.toInt())
        errorView?.visibility = android.view.View.VISIBLE
        webView?.visibility = android.view.View.GONE
        findViewById<android.view.View>(R.id.splash_layout)?.visibility = android.view.View.GONE
    }

    private fun setupWebView() {
        webView?.settings?.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            setSupportZoom(true)
            builtInZoomControls = true
            displayZoomControls = false
        }
        webView?.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                findViewById<android.view.View>(R.id.splash_layout)?.visibility = android.view.View.GONE
                webView?.visibility = android.view.View.VISIBLE
            }
        }
        webView?.webChromeClient = WebChromeClient()
    }

    private fun loadWebApp() {
        webView?.loadUrl("http://127.0.0.1:3001")
    }

    override fun onBackPressed() {
        if (webView?.canGoBack() == true) webView?.goBack()
        else super.onBackPressed()
    }
}
