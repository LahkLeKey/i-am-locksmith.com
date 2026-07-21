import {Metadata} from 'next';

export const templateMetadata: Metadata = {
  metadataBase: new URL('https://i-am-locksmith.com/'),
  title: 'I Am Locksmith',
  description:
      'A B2B SaaS platform for managing locksmiths, their organizations, and their customers.',
  openGraph: {images: ['/og.png']},
};

// Default metadata for when template is removed
export const defaultMetadata: Metadata = {
  title: 'I Am Locksmith',
  description:
      'A B2B SaaS platform for managing locksmiths, their organizations, and their customers.',
};
