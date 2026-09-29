package in.letzshopy.vendor;

import android.webkit.CookieManager;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private void persistWebViewCookies() {
        CookieManager.getInstance().flush();
    }

    @Override
    public void onResume() {
        CookieManager.getInstance().setAcceptCookie(true);
        super.onResume();
    }

    @Override
    public void onPause() {
        persistWebViewCookies();
        super.onPause();
    }

    @Override
    public void onStop() {
        persistWebViewCookies();
        super.onStop();
    }

    @Override
    public void onDestroy() {
        persistWebViewCookies();
        super.onDestroy();
    }
}
