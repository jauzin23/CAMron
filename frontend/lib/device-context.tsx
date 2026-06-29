"use client";

import * as React from "react";
import { getStrictContext } from "./get-strict-context";

interface DeviceContextType {
  isDesktop: boolean;
}

const [DeviceProviderInternal, useDevice] = getStrictContext<DeviceContextType>("DeviceProvider");

export function DeviceProvider({ children }: { children: React.ReactNode }) {
  const [isDesktop, setIsDesktop] = React.useState(true);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobileOrTablet = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i.test(ua);
      setIsDesktop(!isMobileOrTablet);
    }
  }, []);

  return (
    <DeviceProviderInternal value={{ isDesktop }}>
      {children}
    </DeviceProviderInternal>
  );
}

export { useDevice };
