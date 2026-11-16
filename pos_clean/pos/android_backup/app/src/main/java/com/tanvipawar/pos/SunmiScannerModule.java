package com.tanvipawar.pos;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class SunmiScannerModule extends ReactContextBaseJavaModule {

    private static final String TAG = "SunmiScanner";
    private static final String ACTION_DATA_CODE_RECEIVED =
            "com.sunmi.scanner.ACTION_DATA_CODE_RECEIVED";

    private final ReactApplicationContext reactContext;

    private final BroadcastReceiver scannerReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {

            if (!ACTION_DATA_CODE_RECEIVED.equals(intent.getAction())) {
                return;
            }

            Log.d(TAG, "========== SCANNER BROADCAST RECEIVED ==========");

            String barcode = null;

            String[] possibleKeys = {
                    "data",
                    "barcode",
                    "code",
                    "SCAN_BARCODE1",
                    "SCAN_BARCODE"
            };

            for (String key : possibleKeys) {
                String value = intent.getStringExtra(key);

                if (value != null && !value.trim().isEmpty()) {
                    barcode = value.trim();

                    Log.d(
                            TAG,
                            "Barcode found from key [" + key + "]: " + barcode
                    );

                    break;
                }
            }

            if (barcode == null || barcode.isEmpty()) {
                Log.w(TAG, "❌ Scanner broadcast received but barcode is empty");
                return;
            }

            Log.d(TAG, "✅ FINAL BARCODE: " + barcode);

            WritableMap event = Arguments.createMap();
            event.putString("data", barcode);
            event.putString("barcode", barcode);
            event.putString("text", barcode);

            if (reactContext.hasActiveCatalystInstance()) {
                reactContext
                        .getJSModule(
                                DeviceEventManagerModule.RCTDeviceEventEmitter.class
                        )
                        .emit("onBarcodeScanned", event);

                Log.d(TAG, "✅ onBarcodeScanned event emitted");
            } else {
                Log.w(TAG, "❌ React context is not active");
            }
        }
    };

    public SunmiScannerModule(
            ReactApplicationContext reactContext
    ) {
        super(reactContext);

        this.reactContext = reactContext;

        IntentFilter filter = new IntentFilter();
        filter.addAction(ACTION_DATA_CODE_RECEIVED);

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
    reactContext.registerReceiver(
            scannerReceiver,
            filter,
            Context.RECEIVER_EXPORTED
    );
} else {
            reactContext.registerReceiver(
                    scannerReceiver,
                    filter
            );
        }

        Log.d(TAG, "✅ SunmiScannerModule initialized");
        Log.d(TAG, "✅ Scanner receiver registered");
    }

    @NonNull
    @Override
    public String getName() {
        return "SunmiScanner";
    }

    @ReactMethod
    public void helloScanner(Promise promise) {
        Log.d(TAG, "helloScanner() called");
        promise.resolve("Scanner module is alive");
    }

    @Override
    public void invalidate() {
        try {
            reactContext.unregisterReceiver(scannerReceiver);
            Log.d(TAG, "Scanner receiver unregistered");
        } catch (Exception e) {
            Log.e(TAG, "Error unregistering scanner receiver", e);
        }

        super.invalidate();
    }
}