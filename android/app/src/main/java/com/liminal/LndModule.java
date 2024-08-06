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

import lndmobile.Callback;
import lndmobile.Lndmobile;
import lndmobile.RecvStream;
import lndmobile.SendStream;

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

import lndmobile.Callback;

import lnrpc.Walletunlocker;
import lnrpc.LightningOuterClass;
import lnrpc.Stateservice;

import walletrpc.Walletkit;

import routerrpc.RouterOuterClass;

class TrackPaymentsRecvStream implements RecvStream {
    private final ReactApplicationContext reactContext;

    public TrackPaymentsRecvStream(ReactApplicationContext reactContext) {
        this.reactContext = reactContext;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "Payment Notification";
            String description = "Notification for settled payment";
            int importance = NotificationManager.IMPORTANCE_DEFAULT;
            NotificationChannel channel = new NotificationChannel("paymentChannel", name, importance);
            channel.setDescription(description);
            if (reactContext != null) {
                NotificationManager notificationManager = (NotificationManager) reactContext
                        .getSystemService(Context.NOTIFICATION_SERVICE);

                if (notificationManager != null) {
                    notificationManager.createNotificationChannel(channel);
                    Log.d("LND", "Channel created successfully");
                } else {
                    Log.e("LND", "NotificationManager is null");
                }
            } else {
                Log.e("LND", "ReactContext is null");
            }
        }
    }

    @Override
    public void onResponse(byte[] bytes) {
        try {
            if (reactContext == null) {
                Log.e("LND", "ReactContext is null");
                return;
            }
            if (bytes != null) {
                LightningOuterClass.Payment response = LightningOuterClass.Payment.parseFrom(bytes);
                if (response.getStatusValue() == 2) {
                    createNotificationChannel();
                    NotificationCompat.Builder builder = new NotificationCompat.Builder(reactContext,
                            "paymentChannel")
                            .setSmallIcon(R.drawable.ic_small_icon)
                            .setContentTitle("Paid " + response.getValue() + " sats over lightning")
                            .setContentText("A payment has been settled")
                            .setPriority(NotificationCompat.PRIORITY_DEFAULT);
                    NotificationManagerCompat notificationManager = NotificationManagerCompat.from(reactContext);
                    notificationManager.notify(2, builder.build());
                }
            }
        } catch (InvalidProtocolBufferException e) {
            Log.i("LND", "ERR_TRACK_PAYMENTS_RECV_STREAM: " + e.toString());
        }
    }

    @Override
    public void onError(Exception e) {
        Log.e("TrackPaymentsRecvStream", "Error received: ", e);
        if (!"EOF".equals(e.getMessage())) {
            Log.i("LND", "ERR_TRACK_PAYMENTS_RECV_STREAM: " + e.toString());
        }
    }
}

class InvoiceRecvStream implements RecvStream {
    private final ReactApplicationContext reactContext;

    public InvoiceRecvStream(ReactApplicationContext reactContext) {
        this.reactContext = reactContext;
    }

    private void createNotificationChannel() {
        Log.i("LND", "createNotificationChannel()");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "Invoice Notification";
            String description = "Notification for settled invoice";
            int importance = NotificationManager.IMPORTANCE_DEFAULT;
            NotificationChannel channel = new NotificationChannel("invoiceChannel", name, importance);
            channel.setDescription(description);
            if (reactContext != null) {
                NotificationManager notificationManager = (NotificationManager) reactContext
                        .getSystemService(Context.NOTIFICATION_SERVICE);

                if (notificationManager != null) {
                    notificationManager.createNotificationChannel(channel);
                    Log.d("LND", "Channel created successfully");
                } else {
                    Log.e("LND", "NotificationManager is null");
                }
            } else {
                Log.e("LND", "ReactContext is null");
            }
        }
    }

    @Override
    public void onResponse(byte[] bytes) {
        try {
            if (reactContext == null) {
                Log.e("LND", "ReactContext is null");
                return;
            }
            if (bytes != null) {
                LightningOuterClass.Invoice response = LightningOuterClass.Invoice.parseFrom(bytes);
                if (response.getSettled()) {
                    createNotificationChannel();
                    NotificationCompat.Builder builder = new NotificationCompat.Builder(reactContext,
                            "invoiceChannel")
                            .setSmallIcon(R.drawable.ic_small_icon)
                            .setContentTitle("Received " + response.getValue() + " sats over lightning")
                            .setContentText("An invoice has been settled")
                            .setPriority(NotificationCompat.PRIORITY_DEFAULT);
                    NotificationManagerCompat notificationManager = NotificationManagerCompat.from(reactContext);
                    notificationManager.notify(1, builder.build());
                }
            }
        } catch (InvalidProtocolBufferException e) {
            Log.i("LND", "ERR_INVOICE_RECV_STREAM: " + e.toString());
        }
    }

    @Override
    public void onError(Exception e) {
        Log.e("InvoiceRecvStream", "Error received: ", e);
        if (!"EOF".equals(e.getMessage())) {
            Log.i("LND", "ERR_INVOICE_RECV_STREAM: " + e.toString());
        }
    }
}

class PaymentRecvStream implements RecvStream {
    private final Promise promise;
    private final ReactApplicationContext reactContext;

    public PaymentRecvStream(Promise promise, ReactApplicationContext reactContext) {
        this.promise = promise;
        this.reactContext = reactContext;
    }

    @Override
    public void onResponse(byte[] bytes) {
        try {
            if (bytes != null) {
                LightningOuterClass.Payment response = LightningOuterClass.Payment.parseFrom(bytes);
                LightningOuterClass.Payment.PaymentStatus status = response.getStatus();

                String responseStr = response.getPaymentRequest();
                Log.i("PaymentRecvStream", "Response received: " + responseStr);
                WritableMap resultMap = Arguments.createMap();
                switch (status) {
                    case SUCCEEDED:
                        Log.i("PaymentRecvStream", "Payment succeeded");
                        resultMap.putString("state", "succeeded");
                        sendEvent("PaymentUpdate", resultMap);
                        return;

                    case FAILED:
                        Log.i("PaymentRecvStream", "Payment failed");
                        String failureReasonStr = "";
                        int failureReason = response.getFailureReasonValue();
                        switch (failureReason) {
                            case 1:
                                failureReasonStr = "timeout";
                                break;
                            case 2:
                                failureReasonStr = "no route";
                                break;
                            case 3:
                                failureReasonStr = "error";
                                break;
                            case 4:
                                failureReasonStr = "incorrect payment details";
                                break;
                            case 5:
                                failureReasonStr = "insufficient balance";
                                break;
                            default:
                                failureReasonStr = "unknown";
                                break;
                        }
                        resultMap.putString("state", "failed. " + failureReasonStr);
                        sendEvent("PaymentUpdate", resultMap);
                        return;

                    case IN_FLIGHT:
                        Log.i("PaymentRecvStream", "Payment is in flight");
                        resultMap.putString("state", "inflight");
                        sendEvent("PaymentUpdate", resultMap);
                        return;

                    default:
                        Log.i("PaymentRecvStream", "Unknown payment status");
                        resultMap.putString("state", "unknown");
                        sendEvent("PaymentUpdate", resultMap);
                        return;
                }
            }
        } catch (InvalidProtocolBufferException e) {
            promise.reject("ERR_PAYMENT_RECV_STREAM", e.getMessage());
        }
    }

    @Override
    public void onError(Exception e) {
        Log.e("PaymentRecvStream", "Error received: ", e);
        if (!"EOF".equals(e.getMessage())) {
            promise.reject("ERR_PAYMENT_RECV_STREAM", "SendPayment error: " + e.getMessage(), e);
        }
    }

    private void sendEvent(String eventName, WritableMap params) {
        if (reactContext.hasActiveCatalystInstance()) {
            reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit(eventName, params);
        }
    }
}

class OpenChannelRecvStream implements RecvStream {
    private final Promise promise;
    private final ReactApplicationContext reactContext;

    public OpenChannelRecvStream(Promise promise, ReactApplicationContext reactContext) {
        this.promise = promise;
        this.reactContext = reactContext;
    }

    @Override
    public void onResponse(byte[] bytes) {
        try {
            WritableMap resultMap = Arguments.createMap();
            if (bytes != null) {
                LightningOuterClass.OpenStatusUpdate response = LightningOuterClass.OpenStatusUpdate.parseFrom(bytes);
                String pendingChanId = Utils.bytesToHex(response.getPendingChanId().toByteArray());
                LightningOuterClass.ChannelOpenUpdate chanOpenUpdate = response.getChanOpen();
                LightningOuterClass.ChannelPoint chanPoint = chanOpenUpdate.getChannelPoint();
                String fundingTxid = chanPoint.getFundingTxidStr();
                int outputIndex = chanPoint.getOutputIndex();
                resultMap.putString("pendingChanId", pendingChanId);
                resultMap.putString("fundingTxId", fundingTxid + ":" + outputIndex);
                sendEvent("OpenChannelUpdate", resultMap);
                return;
            }
        } catch (InvalidProtocolBufferException e) {
            promise.reject("ERR_OPEN_CHANNEL", "Failed to openchannel: " + e.getMessage(), e);
        }
    }

    @Override
    public void onError(Exception e) {
        Log.e("OpenChannelRecvStream", "Error received: ", e);
        if (!"EOF".equals(e.getMessage())) {
            promise.reject("ERR_OPEN_CHANNEL_RECV_STREAM", "OpenChannel error: " + e.getMessage(), e);
        }
    }

    private void sendEvent(String eventName, @Nullable WritableMap params) {
        if (reactContext.hasActiveCatalystInstance()) {
            reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit(eventName, params);
        }
    }
}

class CloseChannelRecvStream implements RecvStream {
    private final Promise promise;
    private final ReactApplicationContext reactContext;

    public CloseChannelRecvStream(Promise promise, ReactApplicationContext reactContext) {
        this.promise = promise;
        this.reactContext = reactContext;
    }

    @Override
    public void onResponse(byte[] bytes) {
        try {
            WritableMap resultMap = Arguments.createMap();
            if (bytes != null) {
                LightningOuterClass.CloseStatusUpdate response = LightningOuterClass.CloseStatusUpdate.parseFrom(bytes);
                LightningOuterClass.PendingUpdate pendingUpdate = response.getClosePending();
                LightningOuterClass.ChannelCloseUpdate closeUpdate = response.getChanClose();
                String closingTxid = pendingUpdate.getTxid().toStringUtf8();
                String outputIndex = String.valueOf(pendingUpdate.getOutputIndex());
                String channelPoint = closingTxid + ":" + outputIndex;
                resultMap.putString("pendingCloseId", channelPoint);
                String closeId = closeUpdate.getClosingTxid().toStringUtf8();
                boolean success = closeUpdate.getSuccess();
                resultMap.putString("closeId", closeId);
                resultMap.putBoolean("success", success);
                sendEvent("CloseChannelUpdate", resultMap);
                return;
            }
        } catch (InvalidProtocolBufferException e) {
            promise.reject("ERR_OPEN_CHANNEL", "Failed to openchannel: " + e.getMessage(), e);
        }
    }

    @Override
    public void onError(Exception e) {
        Log.e("CloseChannelRecvStream", "Error received: ", e);
        if (!"EOF".equals(e.getMessage())) {
            promise.reject("ERR_CLOSE_CHANNEL_RECV_STREAM", "CloseChannel error: " + e.getMessage(), e);
        }
    }

    private void sendEvent(String eventName, @Nullable WritableMap params) {
        if (reactContext.hasActiveCatalystInstance()) {
            reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit(eventName, params);
        }
    }
}

public class LndModule extends ReactContextBaseJavaModule {
    public static boolean lndStarted;
    public static boolean gossipSync;
    public static ReactApplicationContext reactContext;

    public LndModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "LndModule";
    }

    private void sendEvent(String eventName, @Nullable WritableMap params) {
        if (reactContext.hasActiveCatalystInstance()) {
            reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit(eventName, params);
        }
    }

    public void restartApp() {
        Intent nextIntent = new Intent(reactContext, MainActivity.class);
        ProcessPhoenix.triggerRebirth(reactContext, nextIntent);
    }

    @ReactMethod
    public void isRunning(Promise promise) {
        promise.resolve(lndStarted);
    }

    @ReactMethod
    public void resetMc(Promise promise) {
        RouterOuterClass.ResetMissionControlRequest request = serializeResetMissionControl();
        Lndmobile.routerResetMissionControl(request.toByteArray(), new lndmobile.Callback() {
            @Override
            public void onError(Exception e) {
                promise.reject("ERR_RESET_MISSION_CONTROL", e);
            }

            @Override
            public void onResponse(byte[] bytes) {
                Log.i("LND", "resetmc");
                try {
                    if (bytes != null) {
                        RouterOuterClass.ResetMissionControlResponse response = RouterOuterClass.ResetMissionControlResponse
                                .parseFrom(bytes);
                    }
                    promise.resolve("{}");
                } catch (InvalidProtocolBufferException e) {
                    promise.reject("ERR_RESET_MISSION_CONTROL", e);
                }
            }
        });
    }

    @ReactMethod
    public void getNetworkInfo(Promise promise) {
        LightningOuterClass.NetworkInfoRequest request = serializeGetNetworkInfo();
        Lndmobile.getNetworkInfo(request.toByteArray(), new lndmobile.Callback() {
            @Override
            public void onError(Exception e) {
                promise.reject("ERR_GET_NETWORK_INFO", e);
            }

            @Override
            public void onResponse(byte[] bytes) {
                Log.i("LND", "getnetworkinfo");
                try {
                    LightningOuterClass.NetworkInfo response = LightningOuterClass.NetworkInfo.parseFrom(bytes);
                    WritableMap resultMap = Arguments.createMap();
                    resultMap.putDouble("numNodes", response.getNumNodes());
                    resultMap.putDouble("numChannels", response.getNumChannels());
                    resultMap.putDouble("numZombies", response.getNumZombieChans());
                    promise.resolve(resultMap);
                } catch (InvalidProtocolBufferException e) {
                    promise.reject("ERR_GET_NETWORK_INFO", e);
                }
            }
        });
    }

    @ReactMethod
    public void getStatus(Promise promise) {
        Stateservice.GetStateRequest request = serializeGetStatus();
        Lndmobile.getState(request.toByteArray(), new lndmobile.Callback() {
            @Override
            public void onError(Exception e) {
                promise.reject("ERR_GET_STATUS", e);
                return;
            }

            @Override
            public void onResponse(byte[] bytes) {
                // Log.i("LND", "getstatus");
                if (!lndStarted && gossipSync) {
                    promise.resolve("gossipsync");
                }
                try {
                    if (bytes == null) {
                        promise.reject("unknown");
                        return;
                    }
                    Stateservice.GetStateResponse response = Stateservice.GetStateResponse.parseFrom(bytes);
                    Stateservice.WalletState state = response.getState();
                    switch (state) {
                        case NON_EXISTING:
                            promise.resolve("nonexisting");
                            break;

                        case LOCKED:
                            promise.resolve("locked");
                            break;

                        case UNLOCKED:
                            promise.resolve("unlocked");
                            break;

                        case RPC_ACTIVE:
                            promise.resolve("rpcactive");
                            break;

                        case SERVER_ACTIVE:
                            promise.resolve("serveractive");
                            break;

                        case WAITING_TO_START:
                            promise.resolve("waitingtostart");
                            break;

                        default:
                            promise.reject("ERR_GET_STATUS", "unknown");
                            break;
                    }
                } catch (InvalidProtocolBufferException e) {
                    promise.reject("ERR_GET_STATUS", e);
                }
            }
        });
    }

    @ReactMethod
    public void newAddress(Promise promise) {
        Log.i("LND", "newaddress");
        LightningOuterClass.NewAddressRequest request = serializeNewAddress();
        Lndmobile.newAddress(request.toByteArray(), new lndmobile.Callback() {
            @Override
            public void onError(Exception e) {
                Log.e("LND", "Error newaddress", e);
                promise.reject("ERR_NEW_ADDRESS", e);
                return;
            }

            @Override
            public void onResponse(byte[] bytes) {
                try {
                    if (bytes != null) {
                        LightningOuterClass.NewAddressResponse response = LightningOuterClass.NewAddressResponse
                                .parseFrom(bytes);
                        promise.resolve(response.getAddress());
                    }
                } catch (InvalidProtocolBufferException e) {
                    promise.reject("ERR_GET_INFO", e);
                }
            }
        });
    }

    @ReactMethod
    public void sendCoins(String address, double amount, double feeRate, Promise promise) {
        Log.i("LND", "sendcoins");
        LightningOuterClass.SendCoinsRequest request = serializeSendCoins(address, (long) amount, (long) feeRate);
        Lndmobile.sendCoins(request.toByteArray(), new lndmobile.Callback() {
            @Override
            public void onError(Exception e) {
                Log.e("LND", "Error sendcoins", e);
                promise.reject("ERR_SEND_COINS", e);
                return;
            }

            @Override
            public void onResponse(byte[] bytes) {
                try {
                    if (bytes != null) {
                        LightningOuterClass.SendCoinsResponse response = LightningOuterClass.SendCoinsResponse
                                .parseFrom(bytes);
                        promise.resolve(response.getTxid());
                    }
                } catch (InvalidProtocolBufferException e) {
                    promise.reject("ERR_SEND_COINS", e);
                }
            }
        });
    }

    @ReactMethod
    public void openChannel(String connectionURI, double localAmount, double feeRate, boolean announce,
            Promise promise) {
        Log.i("LND", "openchannel");
        LightningOuterClass.OpenChannelRequest request = serializeOpenChannel(connectionURI, (long) localAmount,
                (long) feeRate, announce);
        Lndmobile.openChannel(request.toByteArray(), new OpenChannelRecvStream(promise, reactContext));
    }

    @ReactMethod
    public void closeChannel(String channelPoint, boolean force, double feeRate,
            Promise promise) {
        Log.i("LND", "closechannel");
        LightningOuterClass.CloseChannelRequest request = serializeCloseChannel(channelPoint, force, (long) feeRate);
        Lndmobile.closeChannel(request.toByteArray(), new CloseChannelRecvStream(promise, reactContext));
    }

    @ReactMethod
    public void rescan(Promise promise) {
        Log.i("LND", "requestrescan");
        String lndPath = getReactApplicationContext().getFilesDir().getPath();
        String rescanFileName = "rescanrequested";
        Path rescanFilePath = Paths.get(lndPath, rescanFileName);
        try {
            Files.createFile(rescanFilePath);
            Log.i("LND", "Created rescanrequested");
        } catch (IOException e) {
            Log.i("LND", "Failed to create the requestrescan file");
            promise.reject("ERR_RESCAN", e);
            return;
        }
        restartApp();
    }

    @ReactMethod
    public void forceGossip(Promise promise) {
        Log.i("LND", "forcegossip");
        String lndPath = getReactApplicationContext().getCacheDir().getPath();
        Path filePath = Paths.get(lndPath + "/lastrun");
        if (Files.exists(filePath)) {
            try {
                Files.delete(filePath);
            } catch (IOException e) {
                Log.i("LND", "Failed to forcegossip");
                promise.reject(e);
                return;
            }
        }
        restartApp();
    }

    @ReactMethod
    public void getInfo(Promise promise) {
        LightningOuterClass.GetInfoRequest request = serializeGetInfo();
        Lndmobile.getInfo(request.toByteArray(), new lndmobile.Callback() {
            @Override
            public void onError(Exception e) {
                Log.e("LND", "Error getinfo", e);
                promise.reject("ERR_GET_INFO", e);
                return;
            }

            @Override
            public void onResponse(byte[] bytes) {
                WritableMap resultMap = Arguments.createMap();
                try {
                    if (bytes != null) {
                        LightningOuterClass.GetInfoResponse response = LightningOuterClass.GetInfoResponse
                                .parseFrom(bytes);
                        resultMap.putBoolean("syncedChain", response.getSyncedToChain());
                        resultMap.putBoolean("syncedGraph", response.getSyncedToGraph());
                    } else {
                        resultMap.putBoolean("syncedChain", false);
                        resultMap.putBoolean("syncedGraph", false);
                    }
                    promise.resolve(resultMap);
                } catch (InvalidProtocolBufferException e) {
                    promise.reject("ERR_GET_INFO", e);
                }
            }
        });
    }

    @ReactMethod
    public void genSeed(Promise promise) {
        try {
            Walletunlocker.GenSeedRequest request = serializeGenSeed();
            Lndmobile.genSeed(request.toByteArray(), new lndmobile.Callback() {
                @Override
                public void onError(Exception e) {
                    Log.e("LND", "Error genseed", e);
                    promise.reject("ERR_GEN_SEED", e);
                    return;
                }

                @Override
                public void onResponse(byte[] bytes) {
                    try {
                        Walletunlocker.GenSeedResponse response = Walletunlocker.GenSeedResponse.parseFrom(bytes);
                        List<String> seedMnemonicList = response.getCipherSeedMnemonicList();
                        String seed = String.join(" ", seedMnemonicList);
                        Log.i("LND", "Genseed succeeded with response: " + seed);
                        promise.resolve(seed);
                    } catch (InvalidProtocolBufferException e) {
                        promise.reject("ERR_GEN_SEED", "Failed to genseed: " + e.getMessage(), e);
                    }
                }
            });
        } catch (Exception e) {
            promise.reject("ERR_GEN_SEED", "Failed to genseed: " + e.getMessage(), e);
        }
    }

    @ReactMethod
    public void initWallet(String seed, boolean recovery, String channelBackups, Promise promise) {
        if (seed == null || seed.trim().isEmpty()) {
            promise.reject("ERR_INIT_WALLET", "Seed is null or empty");
            return;
        }
        Walletunlocker.InitWalletRequest request = serializeInitWallet(seed, recovery, channelBackups);
        Lndmobile.initWallet(request.toByteArray(), new lndmobile.Callback() {
            @Override
            public void onError(Exception e) {
                promise.reject("ERR_INIT_WALLET", e);
                return;
            }

            @Override
            public void onResponse(byte[] bytes) {
                Log.i("LND", "Initwallet succeeded");
                try {
                    Walletunlocker.InitWalletResponse response = Walletunlocker.InitWalletResponse.parseFrom(bytes);
                    ByteString adminMacaroonByteString = response.getAdminMacaroon();
                    String adminMacaroon = adminMacaroonByteString.toStringUtf8();
                    promise.resolve(adminMacaroon);
                } catch (InvalidProtocolBufferException e) {
                    promise.reject("ERR_INIT_WALLET", e);
                }
            }
        });
    }

    @ReactMethod
    public void getRecoveryInfo(Promise promise) {
        LightningOuterClass.GetRecoveryInfoRequest request = serializeGetRecoveryInfo();
        Lndmobile.getRecoveryInfo(request.toByteArray(), new lndmobile.Callback() {
            @Override
            public void onError(Exception e) {
                promise.reject("ERR_GET_RECOVERY_INFO", e);
                return;
            }

            @Override
            public void onResponse(byte[] bytes) {
                if (bytes == null) {
                    WritableMap resultMap = Arguments.createMap();
                    resultMap.putBoolean("recoveryMode", false);
                    resultMap.putBoolean("recoveryFinished", false);
                    resultMap.putDouble("progress", 0);
                    promise.resolve(resultMap);
                    return;
                }
                try {
                    LightningOuterClass.GetRecoveryInfoResponse response = LightningOuterClass.GetRecoveryInfoResponse
                            .parseFrom(bytes);
                    WritableMap resultMap = Arguments.createMap();
                    resultMap.putBoolean("recoveryMode", response.getRecoveryMode());
                    resultMap.putBoolean("recoveryFinished", response.getRecoveryFinished());
                    resultMap.putDouble("progress", response.getProgress());
                    promise.resolve(resultMap);
                } catch (InvalidProtocolBufferException e) {
                    promise.reject("ERR_GET_RECOVERY_INFO", e);
                    return;
                }
            }
        });
    }

    @ReactMethod
    public void addInvoice(String memo, String amount, String expiration, Promise promise) {
        try {
            long longAmount = Long.parseLong(amount);
            long longExpiration = Long.parseLong(expiration);
            LightningOuterClass.Invoice request = serializeAddInvoice(memo, longAmount, longExpiration);
            Lndmobile.addInvoice(request.toByteArray(), new lndmobile.Callback() {
                @Override
                public void onError(Exception e) {
                    promise.reject("ERR_ADD_INVOICE", e);
                    return;
                }

                @Override
                public void onResponse(byte[] bytes) {
                    try {
                        LightningOuterClass.AddInvoiceResponse response = LightningOuterClass.AddInvoiceResponse
                                .parseFrom(bytes);
                        String paymentRequest = response.getPaymentRequest();
                        promise.resolve(paymentRequest);
                    } catch (InvalidProtocolBufferException e) {
                        promise.reject("ERR_ADD_INVOICE", "Failed to addinvoice: " + e.getMessage(), e);
                    }
                }
            });
        } catch (NumberFormatException e) {
            promise.reject("ERR_ADD_INVOICE", "Failed to parse inputs for addinvoice: " + e.getMessage(), e);
            return;
        }
    }

    @ReactMethod
    public void sendPayment(String paymentRequest, Promise promise) {
        CompletableFuture<LightningOuterClass.PayReq> future = new CompletableFuture<>();
        LightningOuterClass.PayReqString decodeRequest = serializeDecodeInvoice(paymentRequest);
        Lndmobile.decodePayReq(decodeRequest.toByteArray(), new lndmobile.Callback() {
            @Override
            public void onError(Exception e) {
                future.completeExceptionally(e);
            }

            @Override
            public void onResponse(byte[] bytes) {
                try {
                    LightningOuterClass.PayReq response = LightningOuterClass.PayReq.parseFrom(bytes);
                    future.complete(response);
                } catch (InvalidProtocolBufferException e) {
                    future.completeExceptionally(e);
                }
            }
        });
        try {
            LightningOuterClass.PayReq decodeResponse = future.get();
            RouterOuterClass.SendPaymentRequest request = serializeSendPayment(paymentRequest,
                    decodeResponse.getNumSatoshis());
            Lndmobile.routerSendPaymentV2(request.toByteArray(), new PaymentRecvStream(promise, reactContext));
        } catch (Exception e) {
            promise.reject("ERR_DECODE_PAYREQ", e);
            return;
        }
    }

    @ReactMethod
    public void decodeInvoice(String paymentRequest, Promise promise) {
        LightningOuterClass.PayReqString request = serializeDecodeInvoice(paymentRequest);
        Lndmobile.decodePayReq(request.toByteArray(), new lndmobile.Callback() {
            @Override
            public void onError(Exception e) {
                promise.reject("ERR_DECODE_PAYREQ", e);
                return;
            }

            @Override
            public void onResponse(byte[] bytes) {
                try {
                    LightningOuterClass.PayReq response = LightningOuterClass.PayReq.parseFrom(bytes);
                    WritableMap resultMap = Arguments.createMap();
                    resultMap.putString("amount", Long.toString(response.getNumSatoshis()));
                    resultMap.putString("memo", response.getDescription());
                    promise.resolve(resultMap);
                } catch (InvalidProtocolBufferException e) {
                    promise.reject("ERR_DECODE_PAYREQ", e);
                }
            }
        });
    }

    @ReactMethod
    public void listUnspent(Promise promise) {
        Walletkit.ListUnspentRequest request = serializeListUnspent();
        Lndmobile.walletKitListUnspent(request.toByteArray(), new lndmobile.Callback() {
            @Override
            public void onError(Exception e) {
                promise.reject("ERR_LIST_UNSPENT", e);
                return;
            }

            @Override
            public void onResponse(byte[] bytes) {
                Log.i("LND", "listunspent");
                try {
                    WritableArray utxosArray = Arguments.createArray();
                    if (bytes != null) {
                        Walletkit.ListUnspentResponse response = Walletkit.ListUnspentResponse.parseFrom(bytes);
                        Log.i("LND", "UTXO count: " + response.getUtxosList().size());
                        for (LightningOuterClass.Utxo utxo : response.getUtxosList()) {
                            WritableMap utxoMap = Arguments.createMap();
                            Log.i("LND", "Found utxo " + utxo.getAddress());
                            utxoMap.putString("address", utxo.getAddress());
                            utxoMap.putDouble("amount", utxo.getAmountSat());
                            utxoMap.putDouble("confs", utxo.getConfirmations());
                            utxosArray.pushMap(utxoMap);
                        }
                    } else {
                        Log.i("LND", "listunspent returned null");
                    }
                    promise.resolve(utxosArray);
                } catch (InvalidProtocolBufferException e) {
                    Log.e("LND", "Error parsing ListUnspentResponse", e);
                    promise.reject("ERROR_PARSING_RESPONSE", e);
                }
            }
        });
    }

    @ReactMethod
    public void listChannels(Promise promise) {
        LightningOuterClass.ListChannelsRequest request = serializeListChannels();
        Lndmobile.listChannels(request.toByteArray(), new lndmobile.Callback() {
            @Override
            public void onError(Exception e) {
                promise.reject("ERR_LIST_CHANNELS", e);
            }

            @Override
            public void onResponse(byte[] bytes) {
                Log.i("LND", "listchannels");
                try {
                    WritableArray channelsArray = Arguments.createArray();
                    if (bytes != null) {
                        LightningOuterClass.ListChannelsResponse response = LightningOuterClass.ListChannelsResponse
                                .parseFrom(bytes);
                        for (LightningOuterClass.Channel channel : response.getChannelsList()) {
                            WritableMap channelMap = Arguments.createMap();
                            channelMap.putBoolean("active", channel.getActive());
                            channelMap.putBoolean("private", channel.getPrivate());
                            channelMap.putBoolean("initiator", channel.getInitiator());
                            channelMap.putString("remotePubkey", channel.getRemotePubkey());
                            channelMap.putString("channelPoint", channel.getChannelPoint());
                            channelMap.putDouble("capacity", channel.getCapacity());
                            channelMap.putDouble("localBalance", channel.getLocalBalance());
                            channelMap.putDouble("remoteBalance", channel.getRemoteBalance());
                            channelMap.putDouble("commitFee", channel.getCommitFee());
                            channelMap.putDouble("pendingHtlcsCount", channel.getPendingHtlcsCount());
                            channelMap.putDouble("localChannelReserve", channel.getLocalChanReserveSat());
                            channelMap.putDouble("remoteChannelReserve", channel.getRemoteChanReserveSat());
                            channelsArray.pushMap(channelMap);
                        }
                    }
                    promise.resolve(channelsArray);
                } catch (InvalidProtocolBufferException e) {
                    Log.e("LND", "Error parsing ListChannelsResponse", e);
                    promise.reject("ERROR_PARSING_RESPONSE", e);
                }
            }
        });
    }

    @ReactMethod
    public void pendingChannels(Promise promise) {
        LightningOuterClass.PendingChannelsRequest request = serializePendingChannels();
        Lndmobile.pendingChannels(request.toByteArray(), new lndmobile.Callback() {
            @Override
            public void onError(Exception e) {
                promise.reject("ERR_PENDING_CHANNELS", e);
            }

            @Override
            public void onResponse(byte[] bytes) {
                Log.i("LND", "pendingchannels");
                try {
                    WritableArray channelsArray = Arguments.createArray();
                    if (bytes != null) {
                        LightningOuterClass.PendingChannelsResponse response = LightningOuterClass.PendingChannelsResponse
                                .parseFrom(bytes);
                        for (LightningOuterClass.PendingChannelsResponse.PendingOpenChannel pendingOpenChannel : response.getPendingOpenChannelsList()) {
                            LightningOuterClass.PendingChannelsResponse.PendingChannel channel = pendingOpenChannel.getChannel();
                            WritableMap channelMap = Arguments.createMap();
                            channelMap.putBoolean("active", false);
                            channelMap.putString("class", "Pending Open");
                            channelMap.putBoolean("private", channel.getPrivate());
                            channelMap.putDouble("initiator", channel.getInitiatorValue());
                            channelMap.putString("remotePubkey", channel.getRemoteNodePub());
                            channelMap.putString("channelPoint", channel.getChannelPoint());
                            channelMap.putDouble("capacity", channel.getCapacity());
                            channelMap.putDouble("localBalance", channel.getLocalBalance());
                            channelMap.putDouble("remoteBalance", channel.getRemoteBalance());
                            channelMap.putDouble("localChannelReserve", channel.getLocalChanReserveSat());
                            channelMap.putDouble("remoteChannelReserve", channel.getRemoteChanReserveSat());
                            channelsArray.pushMap(channelMap);
                        }
                        for (LightningOuterClass.PendingChannelsResponse.ForceClosedChannel pendingForceClosedChannel : response.getPendingForceClosingChannelsList()) {
                            LightningOuterClass.PendingChannelsResponse.PendingChannel channel = pendingForceClosedChannel.getChannel();
                            WritableMap channelMap = Arguments.createMap();
                            channelMap.putString("closeTx", pendingForceClosedChannel.getClosingTxid());
                            channelMap.putDouble("maturityHeight", pendingForceClosedChannel.getMaturityHeight());
                            channelMap.putDouble("blocksTilMaturity", pendingForceClosedChannel.getBlocksTilMaturity());
                            channelMap.putBoolean("active", false);
                            channelMap.putString("class", "Pending Force Close");
                            channelMap.putBoolean("private", channel.getPrivate());
                            channelMap.putDouble("initiator", channel.getInitiatorValue());
                            channelMap.putString("remotePubkey", channel.getRemoteNodePub());
                            channelMap.putString("channelPoint", channel.getChannelPoint());
                            channelMap.putDouble("capacity", channel.getCapacity());
                            channelMap.putDouble("localBalance", channel.getLocalBalance());
                            channelMap.putDouble("remoteBalance", channel.getRemoteBalance());
                            channelMap.putDouble("localChannelReserve", channel.getLocalChanReserveSat());
                            channelMap.putDouble("remoteChannelReserve", channel.getRemoteChanReserveSat());
                            channelsArray.pushMap(channelMap);
                        }
                        for (LightningOuterClass.PendingChannelsResponse.WaitingCloseChannel waitingCloseChannel : response.getWaitingCloseChannelsList()) {
                            LightningOuterClass.PendingChannelsResponse.PendingChannel channel = waitingCloseChannel.getChannel();
                            WritableMap channelMap = Arguments.createMap();
                            channelMap.putString("closeTx", waitingCloseChannel.getClosingTxid());
                            channelMap.putBoolean("active", false);
                            channelMap.putString("class", "Waiting Close");
                            channelMap.putBoolean("private", channel.getPrivate());
                            channelMap.putDouble("initiator", channel.getInitiatorValue());
                            channelMap.putString("remotePubkey", channel.getRemoteNodePub());
                            channelMap.putString("channelPoint", channel.getChannelPoint());
                            channelMap.putDouble("capacity", channel.getCapacity());
                            channelMap.putDouble("localBalance", channel.getLocalBalance());
                            channelMap.putDouble("remoteBalance", channel.getRemoteBalance());
                            channelMap.putDouble("localChannelReserve", channel.getLocalChanReserveSat());
                            channelMap.putDouble("remoteChannelReserve", channel.getRemoteChanReserveSat());
                            channelsArray.pushMap(channelMap);
                        }
                    }
                    promise.resolve(channelsArray);
                } catch (InvalidProtocolBufferException e) {
                    Log.e("LND", "Error parsing PendingChannelsResponse", e);
                    promise.reject("ERROR_PARSING_RESPONSE", e);
                }
            }
        });
    }

    @ReactMethod
    public void closedChannels(Promise promise) {
        LightningOuterClass.ClosedChannelsRequest request = serializeClosedChannels();
        Lndmobile.closedChannels(request.toByteArray(), new lndmobile.Callback() {
            @Override
            public void onError(Exception e) {
                promise.reject("ERR_CLOSED_CHANNELS", e);
            }

            @Override
            public void onResponse(byte[] bytes) {
                Log.i("LND", "closedchannels");
                try {
                    WritableArray channelsArray = Arguments.createArray();
                    if (bytes != null) {
                        LightningOuterClass.ClosedChannelsResponse response = LightningOuterClass.ClosedChannelsResponse
                                .parseFrom(bytes);
                        for (LightningOuterClass.ChannelCloseSummary channel : response.getChannelsList()) {
                            WritableMap channelMap = Arguments.createMap();
                            channelMap.putBoolean("active", false);
                            channelMap.putDouble("closeInitiator", channel.getCloseInitiatorValue());
                            channelMap.putString("remotePubkey", channel.getRemotePubkey());
                            channelMap.putString("channelPoint", channel.getChannelPoint());
                            channelMap.putDouble("capacity", channel.getCapacity());
                            channelMap.putDouble("localBalance", channel.getSettledBalance());
                            channelsArray.pushMap(channelMap);
                        }
                    }
                    promise.resolve(channelsArray);
                } catch (InvalidProtocolBufferException e) {
                    Log.e("LND", "Error parsing ClosedChannelsResponse", e);
                    promise.reject("ERROR_PARSING_RESPONSE", e);
                }
            }
        });
    }

    @ReactMethod
    public void listPayments(Promise promise) {
        LightningOuterClass.ListPaymentsRequest request = serializeListPayments();
        Lndmobile.listPayments(request.toByteArray(), new lndmobile.Callback() {
            @Override
            public void onError(Exception e) {
                promise.reject("ERR_LIST_PAYMENTS", e);
            }

            @Override
            public void onResponse(byte[] bytes) {
                // Log.i("LND", "listpayments");
                WritableArray paymentsArray = Arguments.createArray();
                try {
                    if (bytes == null) {
                        promise.resolve(paymentsArray);
                        return;
                    }
                    LightningOuterClass.ListPaymentsResponse response = LightningOuterClass.ListPaymentsResponse
                            .parseFrom(bytes);
                    for (LightningOuterClass.Payment payment : response.getPaymentsList()) {
                        WritableMap paymentMap = Arguments.createMap();
                        paymentMap.putString("type", "payment");
                        paymentMap.putString("pr", payment.getPaymentRequest());
                        paymentMap.putDouble("creationDate", payment.getCreationDate());
                        CompletableFuture<LightningOuterClass.PayReq> future = new CompletableFuture<>();
                        LightningOuterClass.PayReqString request = serializeDecodeInvoice(payment.getPaymentRequest());
                        Lndmobile.decodePayReq(request.toByteArray(), new lndmobile.Callback() {
                            @Override
                            public void onError(Exception e) {
                                future.completeExceptionally(e);
                            }

                            @Override
                            public void onResponse(byte[] bytes) {
                                try {
                                    LightningOuterClass.PayReq response = LightningOuterClass.PayReq.parseFrom(bytes);
                                    future.complete(response);
                                } catch (InvalidProtocolBufferException e) {
                                    future.completeExceptionally(e);
                                }
                            }
                        });
                        try {
                            // Block and wait for decode
                            LightningOuterClass.PayReq decodedResponse = future.get();
                            paymentMap.putString("memo", decodedResponse.getDescription());
                            paymentMap.putString("id", payment.getPaymentHash());
                            paymentMap.putString("paymentPreimage", payment.getPaymentPreimage());
                            paymentMap.putDouble("value", payment.getValue());
                            paymentsArray.pushMap(paymentMap);
                        } catch (Exception e) {
                            promise.reject("ERR_DECODE_PAYREQ", e);
                            return;
                        }
                    }
                } catch (InvalidProtocolBufferException e) {
                    Log.e("LND", "Error parsing ListPaymentsResponse", e);
                    promise.reject("ERROR_PARSING_RESPONSE", e);
                }
                promise.resolve(paymentsArray);
            }
        });
    }

    @ReactMethod
    public void getTransactions(Promise promise) {
        LightningOuterClass.GetTransactionsRequest request = serializeGetTransactions();
        Lndmobile.getTransactions(request.toByteArray(), new lndmobile.Callback() {
            @Override
            public void onError(Exception e) {
                promise.reject("ERR_GET_TRANSACTIONS", e);
                return;
            }

            @Override
            public void onResponse(byte[] bytes) {
                // Log.i("LND", "gettransactions");
                WritableArray transactionsArray = Arguments.createArray();
                try {
                    if (bytes == null) {
                        promise.resolve(transactionsArray);
                        return;
                    }
                    LightningOuterClass.TransactionDetails response = LightningOuterClass.TransactionDetails
                            .parseFrom(bytes);
                    for (LightningOuterClass.Transaction tx : response.getTransactionsList()) {
                        WritableMap txMap = Arguments.createMap();
                        txMap.putString("id", tx.getTxHash());
                        txMap.putDouble("value", tx.getAmount());
                        txMap.putDouble("confs", tx.getNumConfirmations());
                        txMap.putDouble("creationDate", tx.getTimeStamp());
                        txMap.putDouble("fees", tx.getTotalFees());
                        txMap.putString("label", tx.getLabel());
                        txMap.putString("rawHex", tx.getRawTxHex());
                        transactionsArray.pushMap(txMap);
                        // TODO: output details
                    }
                } catch (InvalidProtocolBufferException e) {
                    Log.e("LND", "Error parsing TransactionDetails", e);
                    promise.reject("ERROR_PARSING_RESPONSE", e);
                }
                promise.resolve(transactionsArray);
            }
        });
    }

    @ReactMethod
    public void listInvoices(Promise promise) {
        LightningOuterClass.ListInvoiceRequest request = serializeListInvoices();
        Lndmobile.listInvoices(request.toByteArray(), new lndmobile.Callback() {
            @Override
            public void onError(Exception e) {
                promise.reject("ERR_LIST_INVOICES", e);
                return;
            }

            @Override
            public void onResponse(byte[] bytes) {
                // Log.i("LND", "listinvoice");
                try {
                    WritableArray invoicesArray = Arguments.createArray();
                    if (bytes != null) {
                        LightningOuterClass.ListInvoiceResponse response = LightningOuterClass.ListInvoiceResponse
                                .parseFrom(bytes);
                        for (LightningOuterClass.Invoice inv : response.getInvoicesList()) {
                            WritableMap invoiceMap = Arguments.createMap();
                            String paymentRequest = inv.getPaymentRequest();
                            ByteString rHashByteString = inv.getRHash();
                            String rHash = Utils.bytesToHex(rHashByteString.toByteArray());
                            invoiceMap.putString("type", "invoice");
                            invoiceMap.putString("memo", inv.getMemo());
                            invoiceMap.putString("id", rHash);
                            invoiceMap.putString("pr", paymentRequest);
                            invoiceMap.putDouble("creationDate", inv.getCreationDate());
                            invoiceMap.putDouble("value", inv.getValue());
                            invoiceMap.putBoolean("settled", inv.getSettled());
                            invoiceMap.putDouble("expiry", inv.getExpiry());
                            invoicesArray.pushMap(invoiceMap);
                        }
                    }
                    promise.resolve(invoicesArray);
                } catch (InvalidProtocolBufferException e) {
                    Log.e("LND", "Error parsing ListInvoiceResponse", e);
                    promise.reject("ERROR_PARSING_RESPONSE", e);
                }
            }
        });
    }

    @ReactMethod
    public void getLightningBalance(Promise promise) {
        LightningOuterClass.ChannelBalanceRequest request = serializeGetLightningBalance();
        Lndmobile.channelBalance(request.toByteArray(), new lndmobile.Callback() {
            @Override
            public void onError(Exception e) {
                promise.reject("ERR_CHANNEL_BALANCE");
                return;
            }

            @Override
            public void onResponse(byte[] bytes) {
                // Log.i("LND", "channelbalance");
                try {
                    if (bytes != null) {
                        LightningOuterClass.ChannelBalanceResponse response = LightningOuterClass.ChannelBalanceResponse
                                .parseFrom(bytes);
                        if (response == null) {
                            promise.resolve("0");
                            return;
                        }
                        LightningOuterClass.Amount balance = response.getLocalBalance();
                        promise.resolve(Long.toString(balance.getSat()));
                    } else {
                        promise.resolve("0");
                    }
                } catch (InvalidProtocolBufferException e) {
                    promise.reject("ERR_CHANNEL_BALANCE", e);
                }
            }
        });
    }

    @ReactMethod
    public void getOnchainBalance(Promise promise) {
        LightningOuterClass.WalletBalanceRequest request = serializeGetOnchainBalance();
        Lndmobile.walletBalance(request.toByteArray(), new lndmobile.Callback() {
            @Override
            public void onError(Exception e) {
                promise.reject("ERR_ONCHAINL_BALANCE");
                return;
            }

            @Override
            public void onResponse(byte[] bytes) {
                // Log.i("LND", "walletbalance");
                try {
                    if (bytes != null) {
                        WritableMap resultMap = Arguments.createMap();
                        LightningOuterClass.WalletBalanceResponse response = LightningOuterClass.WalletBalanceResponse
                                .parseFrom(bytes);
                        if (response == null) {
                            promise.resolve("0");
                            return;
                        }
                        resultMap.putDouble("confirmedBalance", response.getConfirmedBalance());
                        resultMap.putDouble("unconfirmedBalance", response.getUnconfirmedBalance());
                        resultMap.putDouble("totalBalance", response.getTotalBalance());
                        promise.resolve(resultMap);
                    } else {
                        promise.resolve("0");
                    }
                } catch (InvalidProtocolBufferException e) {
                    promise.reject("ERR_ONCHAIN_BALANCE", e);
                }
            }
        });
    }

    @ReactMethod
    public void connectPeer(String uri, Promise promise) {
        Log.i("LND", "connectpeer");
        String[] uriParts = uri.split("@");
        if (uriParts.length == 2) {
            String[] hostParts = uriParts[1].split(":");
            if (hostParts.length == 2) {
                LightningOuterClass.ConnectPeerRequest request = serializeConnectPeer(uriParts[0], uriParts[1]);
                Lndmobile.connectPeer(request.toByteArray(), new lndmobile.Callback() {
                    @Override
                    public void onError(Exception e) {
                        promise.reject("ERR_CONNECT_PEER", e);
                        return;
                    }

                    @Override
                    public void onResponse(byte[] bytes) {
                        Log.i("LND", "connectpeer");
                        promise.resolve(true);
                    }
                });
            } else {
                Log.i("LND", "connectpeer error: missing hostparts for openchannel");
            }
        } else {
            Log.i("LND", "connectpeer error: wrong number of URI parts for openchannel");
        }
    }

    private WritableArray convertListToWritableArray(List<WritableMap> allTransactions) {
        WritableArray array = Arguments.createArray();
        for (WritableMap transaction : allTransactions) {
            array.pushMap(transaction);
        }
        return array;
    }

    private WritableMap convertToWritableMap(ReadableMap readableMap) {
        WritableMap writableMap = new WritableNativeMap();
        writableMap.merge(readableMap);
        return writableMap;
    }

    private RouterOuterClass.ResetMissionControlRequest serializeResetMissionControl() {
        return RouterOuterClass.ResetMissionControlRequest.newBuilder().build();
    }

    private LightningOuterClass.OpenChannelRequest serializeOpenChannel(String connectionURI, long localAmount,
            long feeRate, boolean announce) {
        LightningOuterClass.OpenChannelRequest.Builder builder = LightningOuterClass.OpenChannelRequest.newBuilder();
        String[] uriParts = connectionURI.split("@");
        if (uriParts.length == 2) {
            String pubkey = uriParts[0];
            String uri = uriParts[1];
            Log.i("LND", "attempting openchannel to pubkey " + pubkey + " at " + uri);
            String[] hostParts = uri.split(":");
            if (hostParts.length == 2) {
                if (feeRate > 0) {
                    builder.setSatPerVbyte(feeRate);
                }
                builder.setNodePubkey(Utils.hexToByteString(pubkey));
                builder.setLocalFundingAmount(localAmount);
                builder.setPrivate(!announce);
            } else {
                Log.i("LND", "openchannel error: missing hostparts for openchannel");
            }
        } else {
            Log.i("LND", "openchannel error: wrong number of URI parts for openchannel");
        }
        return builder.build();
    }

    private LightningOuterClass.CloseChannelRequest serializeCloseChannel(String channelPoint, boolean force,
            long feeRate) {
        LightningOuterClass.CloseChannelRequest.Builder builder = LightningOuterClass.CloseChannelRequest.newBuilder();
        String[] channelPointParts = channelPoint.split(":");
        if (channelPointParts.length == 2) {
            LightningOuterClass.ChannelPoint.Builder chanPointBuilder = LightningOuterClass.ChannelPoint.newBuilder();
            chanPointBuilder.setFundingTxidStr(channelPointParts[0]);
            try {
                chanPointBuilder.setOutputIndex(Integer.parseInt(channelPointParts[1]));
            } catch (NumberFormatException e) {
                Log.i("LND", "closechannel failed to parse channel point output index");
            }
            builder.setChannelPoint(chanPointBuilder.build());
            builder.setForce(force);
            if (feeRate > 0) {
                builder.setSatPerVbyte(feeRate);
            }
        } else {
            Log.i("LND", "closechannel error: wrong number of channelpoint parts for closechannel");
        }
        return builder.build();
    }

    private LightningOuterClass.NewAddressRequest serializeNewAddress() {
        // LightningOuterClass.AddressType addrType = serializeAddressType();
        LightningOuterClass.NewAddressRequest.Builder builder = LightningOuterClass.NewAddressRequest.newBuilder();
        builder.setTypeValue(4); // p2tr
        return builder.build();
    }

    private LightningOuterClass.ConnectPeerRequest serializeConnectPeer(String pubkey, String host) {
        LightningOuterClass.LightningAddress addr = serializeLightningAddress(pubkey, host);
        return serializeConnectPeer(addr);
    }

    private LightningOuterClass.LightningAddress serializeLightningAddress(String pubkey, String host) {
        LightningOuterClass.LightningAddress.Builder builder = LightningOuterClass.LightningAddress.newBuilder();
        builder.setPubkey(pubkey);
        builder.setHost(host);
        return builder.build();
    }

    private LightningOuterClass.ConnectPeerRequest serializeConnectPeer(LightningOuterClass.LightningAddress addr) {
        LightningOuterClass.ConnectPeerRequest.Builder builder = LightningOuterClass.ConnectPeerRequest.newBuilder();
        builder.setAddr(addr);
        builder.setTimeout(60);
        return builder.build();
    }

    private LightningOuterClass.SendCoinsRequest serializeSendCoins(String address, long amount, long feeRate) {
        LightningOuterClass.SendCoinsRequest.Builder builder = LightningOuterClass.SendCoinsRequest.newBuilder();
        builder.setAddr(address);
        builder.setAmount(amount);
        builder.setSatPerVbyte(feeRate);
        return builder.build();
    }

    private LightningOuterClass.GetInfoRequest serializeGetInfo() {
        return LightningOuterClass.GetInfoRequest.newBuilder().build();
    }

    private LightningOuterClass.GetRecoveryInfoRequest serializeGetRecoveryInfo() {
        return LightningOuterClass.GetRecoveryInfoRequest.newBuilder().build();
    }

    private Walletunlocker.GenSeedRequest serializeGenSeed() {
        return Walletunlocker.GenSeedRequest.newBuilder().build();
    }

    private Walletunlocker.InitWalletRequest serializeInitWallet(String seed, boolean recovery, String channelBackups) {
        Walletunlocker.InitWalletRequest.Builder builder = Walletunlocker.InitWalletRequest.newBuilder();
        builder.setWalletPassword(ByteString.copyFromUtf8("moneyprintergobrrr"));
        String[] seedWords = seed.split(" ");
        for (String seedWord : seedWords) {
            builder.addCipherSeedMnemonic(seedWord);
        }
        if (recovery && channelBackups != "") {
            builder.setRecoveryWindow(2500);
            LightningOuterClass.MultiChanBackup.Builder chanBackupBuilder = LightningOuterClass.MultiChanBackup
                    .newBuilder();
            byte[] decodedBytes = Base64.getDecoder().decode(channelBackups);
            chanBackupBuilder.setMultiChanBackup(ByteString.copyFrom(decodedBytes));
            LightningOuterClass.ChanBackupSnapshot.Builder snapshotBuilder = LightningOuterClass.ChanBackupSnapshot
                    .newBuilder();
            snapshotBuilder.setMultiChanBackup(chanBackupBuilder.build());
            builder.setChannelBackups(snapshotBuilder.build());
        }
        return builder.build();
    }

    private LightningOuterClass.Invoice serializeAddInvoice(String memo, long amount, long expiration) {
        LightningOuterClass.Invoice.Builder builder = LightningOuterClass.Invoice.newBuilder();
        builder.setMemo(memo);
        builder.setValue(amount);
        builder.setExpiry(expiration);
        builder.setPrivate(true);
        return builder.build();
    }

    private RouterOuterClass.SendPaymentRequest serializeSendPayment(String paymentRequest, long amount) {
        RouterOuterClass.SendPaymentRequest.Builder builder = RouterOuterClass.SendPaymentRequest.newBuilder();
        builder.setFeeLimitSat((long) Math.max(100, Math.round(amount * 0.03)));
        Log.i("LND", "feelimit = " + Long.toString((long) Math.round(amount * 0.03)));
        builder.setPaymentRequest(paymentRequest);
        builder.setTimeoutSeconds(120);
        builder.setMaxParts(16);
        builder.setTimePref(1);
        return builder.build();
    }

    private LightningOuterClass.PayReqString serializeDecodeInvoice(String paymentRequest) {
        LightningOuterClass.PayReqString.Builder builder = LightningOuterClass.PayReqString.newBuilder();
        builder.setPayReq(paymentRequest);
        return builder.build();
    }

    private Stateservice.GetStateRequest serializeGetStatus() {
        return Stateservice.GetStateRequest.newBuilder().build();
    }

    private Walletkit.ListUnspentRequest serializeListUnspent() {
        Walletkit.ListUnspentRequest.Builder builder = Walletkit.ListUnspentRequest.newBuilder();
        return builder.build();
    }

    private LightningOuterClass.NetworkInfoRequest serializeGetNetworkInfo() {
        return LightningOuterClass.NetworkInfoRequest.newBuilder().build();
    }

    private LightningOuterClass.ListChannelsRequest serializeListChannels() {
        return LightningOuterClass.ListChannelsRequest.newBuilder().build();
    }

    private LightningOuterClass.PendingChannelsRequest serializePendingChannels() {
        return LightningOuterClass.PendingChannelsRequest.newBuilder().build();
    }

    private LightningOuterClass.ClosedChannelsRequest serializeClosedChannels() {
        return LightningOuterClass.ClosedChannelsRequest.newBuilder().build();
    }

    private LightningOuterClass.ListPaymentsRequest serializeListPayments() {
        return LightningOuterClass.ListPaymentsRequest.newBuilder().build();
    }

    private LightningOuterClass.GetTransactionsRequest serializeGetTransactions() {
        LightningOuterClass.GetTransactionsRequest.Builder builder = LightningOuterClass.GetTransactionsRequest.newBuilder();
        builder.setEndHeight(-1);
        return builder.build();
    }

    private LightningOuterClass.ListInvoiceRequest serializeListInvoices() {
        return LightningOuterClass.ListInvoiceRequest.newBuilder().build();
    }

    private LightningOuterClass.ChannelBalanceRequest serializeGetLightningBalance() {
        return LightningOuterClass.ChannelBalanceRequest.newBuilder().build();
    }

    private LightningOuterClass.WalletBalanceRequest serializeGetOnchainBalance() {
        return LightningOuterClass.WalletBalanceRequest.newBuilder().build();
    }
}
