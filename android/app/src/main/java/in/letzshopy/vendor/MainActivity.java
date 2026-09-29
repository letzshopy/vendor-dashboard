package in.letzshopy.vendor;

import android.webkit.CookieManager;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private void persistWebViewCookies() {
        CookieManager.getInstance().flush();
    }

    @Override
    protected void onResume() {
        CookieManager.getInstance().setAcceptCookie(true);
        super.onResume();
    }

    @Override
    protected void onPause() {
        persistWebViewCookies();
        super.onPause();
    }

    @Override
    protected void onStop() {
        persistWebViewCookies();
        super.onStop();
    }

    @Override
    protected void onDestroy() {
        persistWebViewCookies();
        super.onDestroy();
    }
}
