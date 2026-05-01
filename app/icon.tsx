import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0d0d0d",
          color: "#f3f4f6",
          fontSize: 18,
          fontWeight: 700,
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        PE
      </div>
    ),
    size,
  );
}
