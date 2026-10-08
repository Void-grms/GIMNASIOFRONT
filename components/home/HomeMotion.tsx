"use client";

import { useEffect } from "react";

/** Optional motion: the server-rendered page is fully visible without this component. */
export default function HomeMotion() {
  useEffect(() => {
    const home = document.querySelector<HTMLElement>("[data-home]");
    if (!home) return;

    let cancelled = false;
    let dispose = () => {};

    async function initialize() {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);

      // An import may finish after route navigation or React's development cleanup.
      if (cancelled || !home.isConnected) return;

      gsap.registerPlugin(ScrollTrigger);
      const media = gsap.matchMedia();
      dispose = () => media.revert();

      media.add(
        "(prefers-reduced-motion: no-preference)",
        () => {
          const entrances = new Map<
            HTMLElement,
            ReturnType<typeof gsap.from>
          >();
          const containsFocus = (element: HTMLElement) =>
            element.contains(document.activeElement);
          const isVisible = (element: HTMLElement) => {
            const bounds = element.getBoundingClientRect();
            return (
              bounds.width > 0 &&
              bounds.height > 0 &&
              bounds.bottom > 0 &&
              bounds.top < window.innerHeight
            );
          };

          const heroCopy = Array.from(
            home.querySelectorAll<HTMLElement>("[data-hero-copy]"),
          ).filter((element) => isVisible(element) && !containsFocus(element));

          if (heroCopy.length) {
            const entrance = gsap.from(heroCopy, {
              y: 20,
              opacity: 0,
              duration: 0.65,
              stagger: 0.08,
              ease: "power3.out",
            });
            heroCopy.forEach((element) => entrances.set(element, entrance));
          }

          const heroImage =
            home.querySelector<HTMLElement>("[data-hero-image]");
          if (heroImage && isVisible(heroImage)) {
            gsap.from(heroImage, {
              scale: 1.045,
              duration: 0.9,
              ease: "power2.out",
            });
          }

          home
            .querySelectorAll<HTMLElement>("[data-reveal]")
            .forEach((element) => {
              const bounds = element.getBoundingClientRect();

              // Never re-hide content already visible, including restored scroll positions.
              if (
                bounds.top < window.innerHeight ||
                bounds.width === 0 ||
                bounds.height === 0 ||
                containsFocus(element)
              )
                return;

              const entrance = gsap.from(element, {
                y: 24,
                opacity: 0,
                duration: 0.6,
                ease: "power3.out",
                scrollTrigger: {
                  trigger: element,
                  start: "top 92%",
                  once: true,
                },
              });
              entrances.set(element, entrance);
            });

          // Keyboard navigation is immediate, even when focus jumps below the fold.
          // Completing existing tweens avoids creating untracked animations in an event.
          const revealFocusedContent = (event: FocusEvent) => {
            const target = event.target;
            if (!(target instanceof Node)) return;
            entrances.forEach((entrance, element) => {
              if (!element.contains(target)) return;
              entrance.scrollTrigger?.kill(false);
              entrance.progress(1).kill();
            });
          };

          home.addEventListener("focusin", revealFocusedContent);
          return () =>
            home.removeEventListener("focusin", revealFocusedContent);
        },
        home,
      );

      media.add(
        "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
        () => {
          const hero = home.querySelector<HTMLElement>("[data-hero]");
          const image = hero?.querySelector<HTMLElement>("[data-hero-image]");
          if (!hero || !image) return;

          gsap.fromTo(
            image,
            { yPercent: 0 },
            {
              yPercent: 4,
              ease: "none",
              scrollTrigger: {
                trigger: hero,
                start: "top top",
                end: "bottom top",
                scrub: true,
              },
            },
          );
        },
        home,
      );
    }

    // A failed optional animation import leaves the readable page in place.
    void initialize().catch(() => dispose());

    return () => {
      cancelled = true;
      dispose();
    };
  }, []);

  return null;
}
