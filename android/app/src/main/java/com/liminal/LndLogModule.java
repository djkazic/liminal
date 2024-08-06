package com.liminal;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.RandomAccessFile;

public class LndLogModule extends ReactContextBaseJavaModule {

    public LndLogModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "LndLogModule";
    }

    @ReactMethod
    public void readLastLines(Promise promise) {
        try {
            String lndPath = getReactApplicationContext().getFilesDir().getPath();
            String network = BuildConfig.FLAVOR_network.replace("bitcoin", "").toLowerCase();
            File logFile = new File(lndPath + "/logs/bitcoin/" + network + "/lnd.log");
            if (!logFile.exists()) {
                promise.reject("ERR_FILE_NOT_FOUND", "The log file does not exist at the expected path.");
                return;
            }
            int maxLines = 500;
            int bufferSize = 1024;
            StringBuilder logContent = new StringBuilder();
            RandomAccessFile randomAccessFile = new RandomAccessFile(logFile, "r");
            long fileLength = logFile.length();
            long seekPosition = Math.max(fileLength - bufferSize, 0);
            randomAccessFile.seek(seekPosition);
            byte[] buffer = new byte[bufferSize];
            int bytesRead;
            while ((bytesRead = randomAccessFile.read(buffer)) != -1) {
                logContent.insert(0, new String(buffer, 0, bytesRead, "UTF-8"));
                if (logContent.toString().split("\n").length >= maxLines) {
                    break;
                }
                seekPosition -= bufferSize;
                if (seekPosition < 0) {
                    break;
                }
                randomAccessFile.seek(seekPosition);
            }
            randomAccessFile.close();
            promise.resolve(logContent.toString());
        } catch (IOException e) {
            promise.reject("ERR_READ_LOG", "Failed to read log file: " + e.getMessage(), e);
        }
    }
}
