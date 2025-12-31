/**
 * Platform ve Cihaz Algılama Yardımcıları
 * Smart TV, Desktop, Mobile ve Pi ayrımını yapar.
 */

// Cihaz tipleri
export const DEVICE_TYPES = {
    SMART_TV: 'smart_tv',
    DESKTOP: 'desktop',
    MOBILE: 'mobile',
    TABLET: 'tablet',
    RASPBERRY_PI: 'raspberry_pi'
  };
  
  export const getPlatformInfo = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();
    
    let deviceType = DEVICE_TYPES.DESKTOP;
    let isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
    // Smart TV Tespiti
    // WebOS (LG), Tizen (Samsung), Android TV, Viera (Panasonic), Bravia (Sony)
    const isWebOS = /web0s|webos/.test(userAgent);
    const isTizen = /tizen/.test(userAgent);
    const isAndroidTV = /android/.test(userAgent) && /tv/.test(userAgent); // Genelde 'android' ve 'tv' geçer
    const isSmartTV = isWebOS || isTizen || isAndroidTV || /smart-tv|smarttv|appletv|crkey|googletv|hbbtv|pov_tv|netcast/.test(userAgent);
  
    // Raspberry Pi Tespiti (Linux tabanlı, genellikle standart Chromium kullanır ama ayırt edici olabilir)
    // Kesin tespit zordur, genelde Linux + ARM mimarisi ipucu verir ama masaüstü Linux'tan ayırmak zordur.
    // Proje özelinde "isReceiverMode" veya URL parametresi de kullanılabilir ama userAgent'ta "linux" ve "arm" varsa Pi diyebiliriz.
    const isPi = /linux/.test(userAgent) && /arm/.test(userAgent); 
  
    // Mobil Tespiti
    const isMobile = /iphone|ipod|android|blackberry|iemobile|opera mini/.test(userAgent) && !isSmartTV;
    const isTablet = /ipad|android/.test(userAgent) && !isMobile && !isSmartTV;
  
    if (isSmartTV) {
      deviceType = DEVICE_TYPES.SMART_TV;
    } else if (isPi) {
      deviceType = DEVICE_TYPES.RASPBERRY_PI;
    } else if (isTablet) {
      deviceType = DEVICE_TYPES.TABLET;
    } else if (isMobile) {
      deviceType = DEVICE_TYPES.MOBILE;
    }
  
    return {
      deviceType,
      isSmartTV,
      isWebOS,
      isTizen,
      isAndroidTV,
      isPi,
      isMobile,
      isTouch,
      browserUserAgent: userAgent
    };
  };
  
  /**
   * TV'ler için güvenli alan (Overscan) kontrolü gerekir mi?
   */
  export const shouldApplySafeArea = () => {
    const { isSmartTV } = getPlatformInfo();
    return isSmartTV;
  };
  
  /**
   * TV'ler için performans kısıtlaması gerekir mi?
   * (Karmaşık blur efektlerini kapatmak için)
   */
  export const shouldReduceMotion = () => {
    const { isSmartTV, isPi } = getPlatformInfo();
    // Pi 3 ve eski TV'ler için true dönebilir
    // Şimdilik sadece TV ise true yapıyoruz
    return isSmartTV || isPi;
  };
