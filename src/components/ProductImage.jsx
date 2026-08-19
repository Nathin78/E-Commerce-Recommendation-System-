import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { PRODUCT_PLACEHOLDER_IMAGE, getProductImageSrc } from "../utils/productImage";

export default function ProductImage({ src, alt, sx, ...props }) {
  const [currentSrc, setCurrentSrc] = useState(() => getProductImageSrc(src));

  useEffect(() => {
    setCurrentSrc(getProductImageSrc(src));
  }, [src]);

  const handleError = () => {
    if (currentSrc !== PRODUCT_PLACEHOLDER_IMAGE) {
      setCurrentSrc(PRODUCT_PLACEHOLDER_IMAGE);
    }
  };

  return <Box component="img" src={currentSrc} alt={alt} onError={handleError} sx={sx} {...props} />;
}

