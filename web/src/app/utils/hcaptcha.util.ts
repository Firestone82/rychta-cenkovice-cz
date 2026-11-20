/** The part of the hCaptcha script this component uses. */
export interface HCaptcha {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      hl?: string;
      callback: (token: string) => void;
      'expired-callback': () => void;
      'chalexpired-callback': () => void;
      'error-callback': (code: string) => void;
    },
  ): string;
  reset(id?: string): void;
  remove(id?: string): void;
}

const SCRIPT = 'https://js.hcaptcha.com/1/api.js?render=explicit&recaptchacompat=off';
let loading: Promise<HCaptcha> | null = null;

/** Loads the hCaptcha script once, and only when a form needs it. */
export function loadHCaptcha(): Promise<HCaptcha> {
  const ready = () => (window as unknown as { hcaptcha?: HCaptcha }).hcaptcha;
  loading ??= new Promise<HCaptcha>((resolve, reject) => {
    const present = ready();
    if (present) return resolve(present);
    const script = document.createElement('script');
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => {
      const api = ready();
      if (api) resolve(api);
      else reject(new Error('hCaptcha did not start'));
    };
    script.onerror = () => {
      script.remove();
      reject(new Error('hCaptcha could not be loaded'));
    };
    document.head.append(script);
  }).catch((err: unknown) => {
    loading = null; // let the visitor try again
    throw err;
  });
  return loading;
}
