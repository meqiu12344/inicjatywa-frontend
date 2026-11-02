import Image from 'next/image';
import { clsx } from 'clsx';

interface EventPosterProps {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}

/**
 * Plakat Organizatora w całości, bez przycinania, w kontenerze o dowolnych proporcjach — wolne miejsce
 * wypełnia rozmyta wersja tej samej grafiki. Działa przy wyświetlaniu, więc obejmuje też istniejące plakaty.
 * Rodzic musi mieć `relative` i `overflow-hidden`.
 */
export function EventPoster({ src, alt, sizes, priority, className }: EventPosterProps) {
  return (
    <>
      <Image
        src={src}
        alt=""
        aria-hidden
        fill
        sizes="64px"
        className="object-cover scale-125 blur-xl brightness-90"
      />
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={clsx('object-contain', className)}
      />
    </>
  );
}
