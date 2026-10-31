import React, { createContext, useContext } from "react";
import { STYLES, DEFAULT_STYLE } from "./presets";
import type { VisualStyle } from "./types";

const StyleContext = createContext<VisualStyle>(STYLES[DEFAULT_STYLE]);

export const StyleProvider: React.FC<{ style: VisualStyle; children: React.ReactNode }> = ({ style, children }) => (
  <StyleContext.Provider value={style}>{children}</StyleContext.Provider>
);

export const useStyle = (): VisualStyle => useContext(StyleContext);
