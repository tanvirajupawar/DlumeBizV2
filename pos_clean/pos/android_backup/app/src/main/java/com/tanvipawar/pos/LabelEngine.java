package com.tanvipawar.pos;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Typeface;

import com.facebook.react.bridge.ReadableMap;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.common.BitMatrix;

import java.util.EnumMap;
import java.util.Map;

public class LabelEngine {

    // ==================================================
    // LABEL SIZE
    // 50mm x 25mm
    // ==================================================

    private static final int LABEL_WIDTH = 384;
    private static final int LABEL_HEIGHT = 200;

    // ==================================================
    // MARGINS
    // ==================================================

    private static final int SIDE_MARGIN = 10;

    // ==================================================
    // FONT SIZES — increased from 20/16/16
    // ==================================================

    private static final float NAME_TEXT_SIZE = 26f;
    private static final float PRICE_TEXT_SIZE = 22f;
    private static final float BARCODE_NUMBER_TEXT_SIZE = 20f;

    // ==================================================
    // BARCODE — now spans full label width minus margins
    // ==================================================

    private static final int BARCODE_WIDTH =
            LABEL_WIDTH - (SIDE_MARGIN * 2);   // 364px, was 280

    private static final int BARCODE_HEIGHT = 70;  // was 58


    // ==================================================
    // CREATE COMPLETE LABEL
    // ==================================================

    public static Bitmap createLabel(
            ReadableMap product
    ) throws Exception {

        String name = getString(
                product,
                "name",
                "product_name",
                "productName",
                "product"
        );

        String barcode = getString(
                product,
                "barcode",
                "barcodeValue",
                "barcode_number"
        );

        double price = 0;

        if (
                product.hasKey("price") &&
                !product.isNull("price")
        ) {
            price = product.getDouble("price");
        }

        Bitmap bitmap = Bitmap.createBitmap(
                LABEL_WIDTH,
                LABEL_HEIGHT,
                Bitmap.Config.ARGB_8888
        );

        Canvas canvas = new Canvas(bitmap);

        canvas.drawColor(Color.WHITE);

        Paint paint = new Paint(
                Paint.ANTI_ALIAS_FLAG
        );

        paint.setColor(Color.BLACK);
        paint.setSubpixelText(true);

        // ==============================================
        // MEASURE BLOCK HEIGHT TO CENTER VERTICALLY
        // ==============================================

        // Name row height (font size + small leading)
        float nameBlockHeight = name.isEmpty()
                ? 0f
                : NAME_TEXT_SIZE + 10f;

        // Price row height
        float priceBlockHeight = PRICE_TEXT_SIZE + 10f;

        // Barcode block (image + number row)
        float barcodeBlockHeight = barcode.isEmpty()
                ? 0f
                : BARCODE_HEIGHT + 6f + BARCODE_NUMBER_TEXT_SIZE + 6f;

        float totalContentHeight =
                nameBlockHeight + priceBlockHeight + barcodeBlockHeight;

        // Starting Y so the whole block is centered in LABEL_HEIGHT
        float cursorY =
                (LABEL_HEIGHT - totalContentHeight) / 2f;

        if (cursorY < 4f) {
            cursorY = 4f;
        }

        // ==============================================
        // PRODUCT NAME
        // ==============================================

        if (!name.isEmpty()) {

            name = fitName(name);

            paint.setTextSize(NAME_TEXT_SIZE);

            paint.setTypeface(
                    Typeface.create(
                            Typeface.DEFAULT,
                            Typeface.BOLD
                    )
            );

            cursorY += NAME_TEXT_SIZE;

            drawCenteredText(
                    canvas,
                    name,
                    paint,
                    cursorY
            );

            cursorY += 10f;
        }

        // ==============================================
        // PRICE
        // ==============================================

        String priceText = String.format(
                java.util.Locale.US,
                "Rs. %.2f",
                price
        );

        paint.setTextSize(PRICE_TEXT_SIZE);

        paint.setTypeface(
                Typeface.create(
                        Typeface.DEFAULT,
                        Typeface.NORMAL
                )
        );

        cursorY += PRICE_TEXT_SIZE;

        drawCenteredText(
                canvas,
                priceText,
                paint,
                cursorY
        );

        cursorY += 12f;

        // ==============================================
        // BARCODE — full label width
        // ==============================================

        if (!barcode.isEmpty()) {

            Bitmap barcodeBitmap =
                    createCode128Barcode(
                            barcode,
                            BARCODE_WIDTH,
                            BARCODE_HEIGHT
                    );

            float barcodeLeft =
                    (LABEL_WIDTH - barcodeBitmap.getWidth()) / 2f;

            canvas.drawBitmap(
                    barcodeBitmap,
                    barcodeLeft,
                    cursorY,
                    paint
            );

            cursorY += BARCODE_HEIGHT + 6f;

            // ==========================================
            // BARCODE NUMBER
            // ==========================================

            paint.setTextSize(BARCODE_NUMBER_TEXT_SIZE);

            paint.setTypeface(
                    Typeface.create(
                            Typeface.DEFAULT,
                            Typeface.NORMAL
                    )
            );

            cursorY += BARCODE_NUMBER_TEXT_SIZE;

            drawCenteredText(
                    canvas,
                    barcode,
                    paint,
                    cursorY
            );
        }

        return bitmap;
    }


    // ==================================================
    // CREATE CODE128 BARCODE
    // ==================================================

    private static Bitmap createCode128Barcode(
            String value,
            int width,
            int height
    ) throws Exception {

        Map<EncodeHintType, Object> hints =
                new EnumMap<>(EncodeHintType.class);

        hints.put(EncodeHintType.MARGIN, 0);

        BitMatrix matrix =
                new MultiFormatWriter().encode(
                        value,
                        BarcodeFormat.CODE_128,
                        width,
                        height,
                        hints
                );

        Bitmap bitmap = Bitmap.createBitmap(
                width,
                height,
                Bitmap.Config.ARGB_8888
        );

        for (int x = 0; x < width; x++) {
            for (int y = 0; y < height; y++) {
                bitmap.setPixel(
                        x,
                        y,
                        matrix.get(x, y)
                                ? Color.BLACK
                                : Color.WHITE
                );
            }
        }

        return bitmap;
    }


    // ==================================================
    // CENTER TEXT (horizontal)
    // ==================================================

    private static void drawCenteredText(
            Canvas canvas,
            String text,
            Paint paint,
            float baseline
    ) {

        if (text == null || text.isEmpty()) {
            return;
        }

        float textWidth = paint.measureText(text);
        float x = (LABEL_WIDTH - textWidth) / 2f;

        canvas.drawText(text, x, baseline, paint);
    }


    // ==================================================
    // FIT PRODUCT NAME
    // ==================================================

    private static String fitName(String name) {

        if (name == null) {
            return "";
        }

        name = name.trim();

        if (name.length() > 24) {
            return name.substring(0, 21) + "...";
        }

        return name;
    }


    // ==================================================
    // GET STRING
    // ==================================================

    private static String getString(
            ReadableMap product,
            String... keys
    ) {

        for (String key : keys) {

            if (product.hasKey(key) && !product.isNull(key)) {

                String value = product.getString(key);

                if (value != null && !value.trim().isEmpty()) {
                    return value.trim();
                }
            }
        }

        return "";
    }
}