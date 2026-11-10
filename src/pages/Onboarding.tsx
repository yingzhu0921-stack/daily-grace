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

  // h-screen(100vh)은 아이폰 사파리에서 주소창·툴바 뒤까지 포함해 실제 보이는 영역보다 커서,
  // 맨 아래 버튼이 화면 밖으로 밀려나 스크롤해야 보였다. 보이는 높이(dvh)를 쓴다.
  return (
    <div className="relative h-dvh w-full bg-[#FAFAF9] overflow-hidden">
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
