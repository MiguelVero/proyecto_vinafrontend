// responsive.utils.ts
export class ResponsiveUtils {
  
  // Detectar dispositivo
  static getDeviceType(): string {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const ratio = width / height;
    
    if (width <= 480) return 'mobile';
    if (width <= 768) return 'tablet';
    if (width <= 1024) return 'laptop';
    if (width <= 1440) return 'desktop';
    return 'large-screen';
  }
  
  // Detectar si es móvil
  static isMobile(): boolean {
    return window.innerWidth <= 768;
  }
  
  // Detectar si es tablet
  static isTablet(): boolean {
    return window.innerWidth > 768 && window.innerWidth <= 1024;
  }
  
  // Detectar orientación
  static getOrientation(): string {
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  }
  
  // Safe area insets
  static getSafeAreaInsets(): {
    top: number;
    right: number;
    bottom: number;
    left: number;
  } {
    return {
      top: this.getCssVariableNumber('--safe-area-inset-top'),
      right: this.getCssVariableNumber('--safe-area-inset-right'),
      bottom: this.getCssVariableNumber('--safe-area-inset-bottom'),
      left: this.getCssVariableNumber('--safe-area-inset-left')
    };
  }
  
  private static getCssVariableNumber(variable: string): number {
    const value = getComputedStyle(document.documentElement).getPropertyValue(variable);
    return parseInt(value) || 0;
  }
  
  // Detectar si es un dispositivo con notch
  static hasNotch(): boolean {
    return 'CSS' in window && CSS.supports('padding-top', 'env(safe-area-inset-top)');
  }
  
  // Detectar si es un dispositivo plegable
  static isFoldable(): boolean {
    return 'screen' in window && 'fold' in window.screen;
  }
}