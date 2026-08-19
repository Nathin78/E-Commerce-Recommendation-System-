import { Box, Chip, LinearProgress, Typography } from "@mui/material";
import useCountdown from "../hooks/useCountdown";

export default function FlashCountdown({ sale, serverNow }) {
  const { label, expired } = useCountdown(sale.endTime, serverNow);
  const consumed = sale.stockLimit - sale.remaining;
  const percent = Math.min(100, (consumed / sale.stockLimit) * 100);

  return (
    <Box sx={{ mt: 1 }}>
      <Chip color={expired ? "default" : "error"} size="small" label={expired ? "Expired" : `Ends in ${label}`} />
      <Typography variant="caption" display="block" sx={{ mt: 1 }}>Only {sale.remaining} left</Typography>
      <LinearProgress variant="determinate" value={percent} sx={{ height: 8, borderRadius: 2, mt: 0.5 }} />
    </Box>
  );
}
