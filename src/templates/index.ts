import { DEFAULT_TEMPLATE } from './hero-iphone';
import { IPAD_TEMPLATE } from './ipad';
import { MACBOOK_TEMPLATE } from './macbook';

export const TEMPLATES = [
  DEFAULT_TEMPLATE,
  IPAD_TEMPLATE,
  MACBOOK_TEMPLATE
];

export const getTemplate = (id: string) => TEMPLATES.find(t => t.id === id) || null;
