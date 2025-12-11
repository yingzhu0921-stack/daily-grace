import React, { useState, useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { OnboardingWelcome } from '@/components/onboarding/OnboardingWelcome';
import { OnboardingTimeSetup } from '@/components/onboarding/OnboardingTimeSetup';
import { OnboardingComplete } from '@/components/onboarding/OnboardingComplete';

const Onboarding = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false,
    skipSnaps: false,
    watchDrag: false  // 드래그/스와이프 비활성화
  });
  const [currentSlide, setCurrentSlide] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCurrentSlide(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  return (
    <div className="relative h-screen w-full bg-[#FAF9F7] overflow-hidden">
      <div className="h-full overflow-hidden" ref={emblaRef}>
        <div className="flex h-full">
          <div className="flex-[0_0_100%] min-w-0">
            <OnboardingWelcome onNext={scrollNext} />
          </div>
          <div className="flex-[0_0_100%] min-w-0">
            <OnboardingTimeSetup onNext={scrollNext} />
          </div>
          <div className="flex-[0_0_100%] min-w-0">
            <OnboardingComplete />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
