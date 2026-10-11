import { Ui } from './Ui';

let instance: Ui | null = null;

/** The single DOM overlay, created on first use. */
export function ui(): Ui {
  instance ??= new Ui();
  return instance;
}
