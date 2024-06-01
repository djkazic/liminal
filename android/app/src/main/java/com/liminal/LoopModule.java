package com.liminal;

import android.content.Intent;
import android.util.Log;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import android.graphics.Color;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import litdmobile.Callback;
import litdmobile.Litdmobile;
import litdmobile.RecvStream;
import litdmobile.SendStream;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeMap;

import com.facebook.react.modules.core.DeviceEventManagerModule;

import com.google.protobuf.ByteString;
import com.google.protobuf.InvalidProtocolBufferException;

import com.jakewharton.processphoenix.ProcessPhoenix;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.io.UnsupportedEncodingException;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.Files;

import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;

import litdmobile.Callback;

import looprpc.Client;

public class LoopModule extends ReactContextBaseJavaModule {
    public static boolean loopStarted;
    public static ReactApplicationContext reactContext;

    public LoopModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "LoopModule";
    }

    private void sendEvent(String eventName, @Nullable WritableMap params) {
        if (reactContext.hasActiveCatalystInstance()) {
            reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit(eventName, params);
        }
    }

    @ReactMethod
    public void isRunning(Promise promise) {
        promise.resolve(loopStarted);
    }

    @ReactMethod
    public void loopOutQuote(Promise promise) {
        try {
            Client.QuoteRequest request = serializeQuoteRequest(3, 500_000);
            Litdmobile.swapClientLoopOutQuote(request.toByteArray(), new litdmobile.Callback() {
               @Override
               public void onError(Exception e) {
                    Log.e("LOOP", "Error loopoutquote", e);
                    promise.reject("ERR_LOOP_OUT_QUOTE", e);
                    return;
               }

               @Override
               public void onResponse(byte[] bytes) {
                    try {
                        Client.OutQuoteResponse response = Client.OutQuoteResponse.parseFrom(bytes);
                        String responseString = "Swap fee: " + response.getSwapFeeSat() + " sats, prepay: " 
                            + response.getPrepayAmtSat() + " sats, sweep fee: " + response.getHtlcSweepFeeSat();
                        promise.resolve(responseString);
                    } catch (InvalidProtocolBufferException e) {
                        promise.reject("ERR_LOOP_OUT_QUOTE", "Failed to loopoutquote: " + e.getMessage(), e);
                    }
               }
            });
        } catch (Exception e) {
            promise.reject("ERR_LOOP_OUT_QUOTE", "Failed to loopoutquote: " + e.getMessage(), e);
        }
    }

    @ReactMethod
    public void loopOutTerms(Promise promise) {
        try {
            Client.TermsRequest request = serializeOutTermsRequest();
            Litdmobile.swapClientLoopOutTerms(request.toByteArray(), new litdmobile.Callback() {
               @Override
               public void onError(Exception e) {
                    Log.e("LOOP", "Error loopoutterms", e);
                    promise.reject("ERR_LOOP_OUT_TERMS", e);
                    return;
               }

               @Override
               public void onResponse(byte[] bytes) {
                    try {
                        Client.OutTermsResponse response = Client.OutTermsResponse.parseFrom(bytes);
                        String responseString = "Min: " + response.getMinSwapAmount() + ", Max: " + response.getMaxSwapAmount() 
                            + ", MinCLTV: " + response.getMinCltvDelta() + ", MaxCltv: " + response.getMaxCltvDelta();
                        promise.resolve(responseString);
                    } catch (InvalidProtocolBufferException e) {
                        promise.reject("ERR_LOOP_OUT_TERMS", "Failed to loopoutquote: " + e.getMessage(), e);
                    }
               }
            });
        } catch (Exception e) {
            promise.reject("ERR_LOOP_OUT_QUOTE", "Failed to loopoutquote: " + e.getMessage(), e);
        }
    }

    private Client.QuoteRequest serializeQuoteRequest(long confTarget, long amount) {
        Client.QuoteRequest.Builder builder = Client.QuoteRequest.newBuilder();
        builder.setConfTarget((int) confTarget);
        builder.setAmt(amount);
        long currentTimeInSeconds = System.currentTimeMillis() / 1000;
        long deadline = currentTimeInSeconds + 1800;
        builder.setSwapPublicationDeadline(deadline);
        return builder.build();
    }

    private Client.TermsRequest serializeOutTermsRequest() {
        Client.TermsRequest.Builder builder = Client.TermsRequest.newBuilder();
        return builder.build();
    }
}
