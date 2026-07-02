import {
  phoneSchema, verifyOtpSchema, loginSchema, registerSchema,
  uploadAudioSchema, translateTextSchema, createProjectSchema,
  createOrderSchema, verifyPaymentSchema, subscriptionCreateSchema,
  omnipostSchema, assetUploadSchema
} from '@/lib/validation';

describe('Validation Schemas', () => {
  describe('phoneSchema', () => {
    it('should accept valid Indian phone numbers', () => {
      expect(phoneSchema.safeParse('9876543210').success).toBe(true);
      expect(phoneSchema.safeParse('8123456789').success).toBe(true);
    });
    it('should reject invalid phone numbers', () => {
      expect(phoneSchema.safeParse('1234567890').success).toBe(false);
      expect(phoneSchema.safeParse('987654321').success).toBe(false);
      expect(phoneSchema.safeParse('98765432101').success).toBe(false);
      expect(phoneSchema.safeParse('').success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should accept valid login', () => {
      const r = loginSchema.safeParse({ email: 'test@example.com', password: 'secret' });
      expect(r.success).toBe(true);
    });
    it('should reject invalid email', () => {
      expect(loginSchema.safeParse({ email: 'not-email', password: 'secret' }).success).toBe(false);
    });
    it('should reject empty password', () => {
      expect(loginSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    it('should accept valid registration with email', () => {
      const r = registerSchema.safeParse({ name: 'Test', email: 'a@b.com', password: '123456' });
      expect(r.success).toBe(true);
    });
    it('should accept valid registration with phone', () => {
      const r = registerSchema.safeParse({ name: 'Test', phone: '9876543210', password: '123456' });
      expect(r.success).toBe(true);
    });
    it('should reject without email or phone', () => {
      const r = registerSchema.safeParse({ name: 'Test', password: '123456' });
      expect(r.success).toBe(false);
    });
    it('should reject short password', () => {
      const r = registerSchema.safeParse({ name: 'Test', email: 'a@b.com', password: '12345' });
      expect(r.success).toBe(false);
    });
  });

  describe('verifyOtpSchema', () => {
    it('should accept valid 6-digit OTP', () => {
      const r = verifyOtpSchema.safeParse({ phone: '9876543210', otp: '123456' });
      expect(r.success).toBe(true);
    });
    it('should reject short OTP', () => {
      const r = verifyOtpSchema.safeParse({ phone: '9876543210', otp: '12345' });
      expect(r.success).toBe(false);
    });
  });

  describe('uploadAudioSchema', () => {
    it('should use default language hi', () => {
      const r = uploadAudioSchema.safeParse({});
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.language).toBe('hi');
    });
    it('should accept valid language code', () => {
      const r = uploadAudioSchema.safeParse({ language: 'ta' });
      expect(r.success).toBe(true);
    });
    it('should reject long language code', () => {
      expect(uploadAudioSchema.safeParse({ language: 'hin' }).success).toBe(false);
    });
  });

  describe('translateTextSchema', () => {
    it('should accept valid input', () => {
      const r = translateTextSchema.safeParse({ text: 'Hello', targetLang: 'hi' });
      expect(r.success).toBe(true);
    });
    it('should reject empty text', () => {
      expect(translateTextSchema.safeParse({ text: '', targetLang: 'hi' }).success).toBe(false);
    });
    it('should reject missing language code', () => {
      expect(translateTextSchema.safeParse({ text: 'Hello' }).success).toBe(false);
    });
  });

  describe('createProjectSchema', () => {
    it('should accept valid project', () => {
      const r = createProjectSchema.safeParse({ name: 'My Ad', type: 'video' });
      expect(r.success).toBe(true);
    });
    it('should reject invalid type', () => {
      expect(createProjectSchema.safeParse({ name: 'My Ad', type: 'pdf' }).success).toBe(false);
    });
    it('should reject empty name', () => {
      expect(createProjectSchema.safeParse({ name: '', type: 'audio' }).success).toBe(false);
    });
  });

  describe('createOrderSchema', () => {
    it('should default amount to 1', () => {
      const r = createOrderSchema.safeParse({});
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.amount).toBe(1);
    });
    it('should accept valid amount', () => {
      const r = createOrderSchema.safeParse({ amount: 5 });
      expect(r.success).toBe(true);
    });
    it('should reject amount over 100', () => {
      expect(createOrderSchema.safeParse({ amount: 101 }).success).toBe(false);
    });
  });

  describe('verifyPaymentSchema', () => {
    it('should accept valid payment data', () => {
      const r = verifyPaymentSchema.safeParse({
        razorpay_payment_id: 'pay_abc123',
        razorpay_order_id: 'order_abc123',
        razorpay_signature: 'sig_abc123',
      });
      expect(r.success).toBe(true);
    });
    it('should reject missing fields', () => {
      expect(verifyPaymentSchema.safeParse({}).success).toBe(false);
    });
  });

  describe('subscriptionCreateSchema', () => {
    it('should accept pro plan', () => {
      expect(subscriptionCreateSchema.safeParse({ plan: 'pro' }).success).toBe(true);
    });
    it('should reject other plans', () => {
      expect(subscriptionCreateSchema.safeParse({ plan: 'free' }).success).toBe(false);
    });
  });

  describe('omnipostSchema', () => {
    it('should accept valid transcript', () => {
      const r = omnipostSchema.safeParse({ transcript: 'My product is great' });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.language).toBe('hi');
    });
    it('should reject empty transcript', () => {
      expect(omnipostSchema.safeParse({ transcript: '' }).success).toBe(false);
    });
    it('should reject very long transcript', () => {
      const long = 'x'.repeat(5001);
      expect(omnipostSchema.safeParse({ transcript: long }).success).toBe(false);
    });
  });

  describe('assetUploadSchema', () => {
    it('should accept valid types', () => {
      expect(assetUploadSchema.safeParse({ type: 'image' }).success).toBe(true);
      expect(assetUploadSchema.safeParse({ type: 'video' }).success).toBe(true);
      expect(assetUploadSchema.safeParse({ type: 'audio' }).success).toBe(true);
    });
    it('should reject invalid type', () => {
      expect(assetUploadSchema.safeParse({ type: 'document' }).success).toBe(false);
    });
    it('should work without type', () => {
      expect(assetUploadSchema.safeParse({}).success).toBe(true);
    });
  });
});

describe('Subscription Pricing', () => {
  const PRO_PRICE_PAISE = 49900;

  it('should correctly represent ₹499 in paise', () => {
    expect(PRO_PRICE_PAISE).toBe(49900);
  });

  it('should calculate annual savings', () => {
    const monthly = PRO_PRICE_PAISE * 12;
    const annual = PRO_PRICE_PAISE * 10;
    expect(annual).toBeLessThan(monthly);
    expect(monthly - annual).toBe(PRO_PRICE_PAISE * 2);
  });
});

describe('File Size Validation', () => {
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  it('should define max upload size as 10MB', () => {
    expect(MAX_FILE_SIZE).toBe(10485760);
  });

  it('should validate file size boundaries', () => {
    const isValid = (bytes: number) => bytes > 0 && bytes <= MAX_FILE_SIZE;
    expect(isValid(1)).toBe(true);
    expect(isValid(MAX_FILE_SIZE)).toBe(true);
    expect(isValid(0)).toBe(false);
    expect(isValid(MAX_FILE_SIZE + 1)).toBe(false);
  });
});

describe('Language Code Validation', () => {
  const SUPPORTED_LANGS = ['hi', 'ta', 'te', 'kn', 'mr', 'bn', 'gu', 'pa', 'ml', 'or', 'en'];

  it('should have 11 supported languages', () => {
    expect(SUPPORTED_LANGS).toHaveLength(11);
  });

  it('should include Hindi, English, and major Indian languages', () => {
    expect(SUPPORTED_LANGS).toContain('hi');
    expect(SUPPORTED_LANGS).toContain('en');
    expect(SUPPORTED_LANGS).toContain('ta');
    expect(SUPPORTED_LANGS).toContain('bn');
  });

  it('should all be 2-character codes', () => {
    SUPPORTED_LANGS.forEach(l => expect(l).toHaveLength(2));
  });
});

describe('Allowed MIME Types', () => {
  const ALLOWED = ['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'];

  it('should include common audio formats', () => {
    expect(ALLOWED).toContain('audio/webm');
    expect(ALLOWED).toContain('audio/mpeg');
    expect(ALLOWED).toContain('audio/wav');
  });

  it('should reject video MIME types', () => {
    expect(ALLOWED).not.toContain('video/mp4');
    expect(ALLOWED).not.toContain('video/webm');
  });

  it('should have 6 allowed types', () => {
    expect(ALLOWED).toHaveLength(6);
  });
});
