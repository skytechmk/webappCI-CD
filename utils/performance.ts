// Production performance utilities - debug features removed
export interface WebVitalsMetric {
  name: string;
  value: number;
  id: string;
  delta?: number;
}

// Global type declarations
declare global {
  function gtag(...args: any[]): void;
}

// Web Vitals tracking - production only
export const reportWebVitals = (metric: WebVitalsMetric) => {
  // Production: Send to analytics service
  if (typeof gtag !== 'undefined') {
    gtag('event', metric.name, {
      event_category: 'Web Vitals',
      event_label: metric.id,
      value: Math.round(metric.value),
      custom_map: { metric_value: metric.value }
    });
  }
};

// Image lazy loading helper - production optimized
export const createImageLoader = () => {
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.classList.remove('lazy');
          imageObserver.unobserve(img);
        }
      }
    });
  }, {
    rootMargin: '50px 0px',
    threshold: 0.01
  });

  return {
    observe: (img: HTMLImageElement) => imageObserver.observe(img),
    disconnect: () => imageObserver.disconnect()
  };
};