import { Box } from "@mui/material";

export default function ColorIconBadge({
  icon,
  palette = ["#2563eb", "#06b6d4"],
  size = 40,
  iconSize = 18,
  shadow = "0 10px 22px rgba(37,99,235,0.18)"
}) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: Math.max(12, Math.round(size * 0.32)),
        display: "grid",
        placeItems: "center",
        color: "#fff",
        background: `linear-gradient(135deg, ${palette[0]}, ${palette[1]})`,
        boxShadow: shadow,
        flexShrink: 0,
        "& .MuiSvgIcon-root": {
          fontSize: iconSize
        }
      }}
    >
      {icon}
    </Box>
  );
}
