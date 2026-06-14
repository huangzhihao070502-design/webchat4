package com.webchat4.app

import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private var serverManager: ServerManager? = null
    private var webView: WebView? = null
    private var statusText: TextView? = null
    private var progressBar: android.widget.ProgressBar? = null
    private var titleText: TextView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webview)
        statusText = findViewById(R.id.status_text)
        progressBar = findViewById(R.id.progress_bar)
        titleText = findViewById(R.id.title_text)

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

        statusText?.text = "正在启动..."
        titleText?.text = "WebChat4"

        serverManager = ServerManager(this)
        serverManager?.startServer { success ->
            runOnUiThread {
                if (success) {
                    webView?.loadUrl("http://127.0.0.1:3001")
                } else {
                    val err = serverManager?.lastError ?: "未知错误"
                    statusText?.text = "启动失败:\n\n$err"
                    statusText?.setTextColor(0xFFCC0000.toInt())
                    titleText?.text = "错误"
                    progressBar?.visibility = android.view.View.GONE
                }
            }
        }
    }

    override fun onBackPressed() {
        if (webView?.canGoBack() == true) webView?.goBack()
        else super.onBackPressed()
    }
}
