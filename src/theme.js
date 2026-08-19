import { createTheme } from "@mui/material/styles";

const sharedTheme = {
  shape: {
    borderRadius: 12
  },
  typography: {
    fontFamily: "Poppins, Segoe UI, sans-serif",
    button: {
      textTransform: "none",
      fontWeight: 600
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: "0 6px 20px rgba(0, 0, 0, 0.08)"
        }
      }
    }
  }
};

const lightPalette = {
  mode: "light",
  primary: {
    main: "#111827",
    contrastText: "#ffffff"
  },
  secondary: {
    main: "#f97316",
    contrastText: "#ffffff"
  },
  success: {
    main: "#0f766e",
    contrastText: "#ffffff"
  },
  info: {
    main: "#2563eb",
    contrastText: "#ffffff"
  },
  warning: {
    main: "#d97706",
    contrastText: "#ffffff"
  },
  error: {
    main: "#ef4444",
    contrastText: "#ffffff"
  },
  background: {
    default: "#f6f7fb",
    paper: "#ffffff"
  },
  text: {
    primary: "#111827",
    secondary: "#4b5563"
  },
  divider: "#e5e7eb",
  action: {
    hover: "rgba(15, 23, 42, 0.04)",
    selected: "rgba(15, 23, 42, 0.08)"
  },
  contrast: {
    main: "#0f172a",
    soft: "#e2e8f0",
    paper: "#ffffff",
    border: "#cbd5e1",
    text: "#111827"
  },
  custom: {
    rose: "#fb7185",
    teal: "#14b8a6",
    sky: "#38bdf8",
    amber: "#f59e0b",
    violet: "#8b5cf6"
  }
};

const darkPalette = {
  mode: "dark",
  primary: {
    main: "#f8fafc",
    contrastText: "#0f172a"
  },
  secondary: {
    main: "#fb923c",
    contrastText: "#0f172a"
  },
  success: {
    main: "#2dd4bf",
    contrastText: "#0f172a"
  },
  info: {
    main: "#60a5fa",
    contrastText: "#0f172a"
  },
  warning: {
    main: "#fbbf24",
    contrastText: "#0f172a"
  },
  error: {
    main: "#f87171",
    contrastText: "#0f172a"
  },
  background: {
    default: "#0b1020",
    paper: "#141a2e"
  },
  text: {
    primary: "#f8fafc",
    secondary: "#94a3b8"
  },
  divider: "#27324a",
  action: {
    hover: "rgba(248, 250, 252, 0.06)",
    selected: "rgba(248, 250, 252, 0.1)"
  },
  contrast: {
    main: "#f8fafc",
    soft: "#1f2a44",
    paper: "#141a2e",
    border: "#334155",
    text: "#f8fafc"
  },
  custom: {
    rose: "#fb7185",
    teal: "#2dd4bf",
    sky: "#38bdf8",
    amber: "#fbbf24",
    violet: "#a78bfa"
  }
};

export function createAppTheme(mode = "light") {
  return createTheme({
    ...sharedTheme,
    palette: mode === "dark" ? darkPalette : lightPalette
  });
}

export default createAppTheme;
