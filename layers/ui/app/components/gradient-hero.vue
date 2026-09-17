<template>
  <div class="relative isolate overflow-hidden bg-surface-sunken">
    <!--
      A full-width banner with two lights orbiting behind its content.

      Follows the theme rather than staying dark like the rail. The rail is
      chrome framing a page; this is the top of the page itself, and a dark slab
      above a light one reads as a second application rather than as the same
      one.

      The lights are decorative and unreachable: they carry no information the
      text does not already state.

      The stage is the measure, not the viewport. The banner runs edge to edge
      but its content stops at 86rem, so travel sized against the screen keeps
      growing past the words it is meant to sit behind. Bounding it here makes
      one set of percentages hold from 320px up.
    -->
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 -z-10 mx-auto max-w-[86rem] motion-safe:animate-light-in"
    >
      <!--
        The mover is the stage, and only the mover animates. A percentage in
        `translate` resolves against the element's own box, so a field moved
        directly would carry a travel fixed in rem across a banner that is not,
        which is how an earlier pass ended up spending 14 of every 24 seconds
        outside a 390px screen.
      -->
      <div class="absolute inset-0 will-change-transform motion-safe:animate-orbit-left">
        <!--
          The large one carries the colour. Its offset is small because at this
          size a small fraction of its own width is already a long way, and the
          pair has to leave the centre as one mass of light rather than as two
          circles that happen to touch.

          One strength for both themes, because the colour token already differs
          by theme. The cap is legibility, not taste: the lead sits over the core
          of this field, and past 65% it drops under 4.5:1 against it.
        -->
        <div
          class="light-field absolute top-[40%] left-1/2 size-[clamp(30rem,84vw,62rem)] -translate-x-[68%] -translate-y-1/2 opacity-60 [--light-color:var(--hero-light-primary)]"
        />
      </div>

      <!--
        Roughly two and a half times smaller, which is the ratio the platform's
        own hero uses. Two lights of the same weight read as two and the eye has
        nowhere to land; one clearly leading gives the pair a subject.
      -->
      <div class="absolute inset-0 will-change-transform motion-safe:animate-orbit-right">
        <div
          class="light-field absolute top-[40%] left-1/2 size-[clamp(14rem,34vw,26rem)] translate-x-[10%] -translate-y-1/2 opacity-45 [--light-color:var(--hero-light-support)] dark:opacity-30"
        />
      </div>
    </div>

    <div
      class="mx-auto flex w-full max-w-[86rem] flex-col items-center px-5 py-16 text-center sm:px-8 sm:py-24"
    >
      <slot />
    </div>
  </div>
</template>
