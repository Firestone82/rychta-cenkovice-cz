import { existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { appConfig, type AppConfig } from '../src/config/app.config.js';
import { TestApp } from './support/test-app.js';

interface Photo {
  id: number;
  category: string;
  apartment_id: number | null;
  file: string;
  width: number;
  height: number;
  widths: number[];
  color: string;
  placeholder: string;
  alt: { cs: string; en: string };
  sort: number;
}

const image = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: '#3a6b4f' } })
    .png()
    .toBuffer();

describe('Apartments, photos and news', () => {
  let t: TestApp;
  let mediaDir: string;

  beforeAll(async () => {
    t = await TestApp.create();
    mediaDir = t.app.get<AppConfig>(appConfig.KEY).mediaDir;
    await t.login();
  });
  afterAll(() => t.close());

  const fields = (res: { body: unknown }) =>
    (res.body as { error: { fields: Record<string, string> } }).error.fields;

  describe('apartments', () => {
    it('lists the apartments publicly with what the website shows', async () => {
      const res = await t.call('get', '/apartments').expect(200);
      const items = (res.body as { items: Record<string, unknown>[] }).items;
      expect(items.map((item) => item['slug'])).toEqual(
        [1, 2, 3, 4, 5, 6].map((number) => `apartman-${number}`),
      );
      expect(items[0]).toMatchObject({ number: 1, active: true, cover: null });
      expect(items[0]['layout']).toHaveProperty('en');
      expect(res.get('Cache-Control')).toBe('public, max-age=60');
    });

    it('edits the numbers, type, amenities, labels and texts of an apartment', async () => {
      const [id] = await t.apartmentIds();
      const res = await t
        .call('patch', `/admin/apartments/${id}`)
        .send({
          beds: 5,
          flat_type: '2+kk',
          amenities: ['wifi', 'kettle', 'wifi'],
          labels: [
            { cs: 'Novinka', en: 'New' },
            { cs: '', en: 'Quiet' },
            { cs: '', en: '' },
          ],
          description: { cs: 'Tichý apartmán s výhledem.', en: '' },
          price_per_night: 2400,
          min_nights: 3,
        })
        .expect(200);
      expect(res.body).toMatchObject({
        beds: 5,
        flat_type: '2+kk',
        amenities: ['kettle', 'wifi'],
        labels: [
          { cs: 'Novinka', en: 'New' },
          { cs: 'Quiet', en: 'Quiet' },
        ],
        description: { cs: 'Tichý apartmán s výhledem.', en: '' },
        price_per_night: 2400,
        min_nights: 3,
      });

      const cleared = await t
        .call('patch', `/admin/apartments/${id}`)
        .send({ clear_price: true })
        .expect(200);
      expect(cleared.body).toMatchObject({ price_per_night: null, beds: 5 });
    });

    it('accepts only the fixed types and amenities, and sane numbers', async () => {
      const [id] = await t.apartmentIds();
      const res = await t
        .call('patch', `/admin/apartments/${id}`)
        .send({
          flat_type: 'penthouse',
          amenities: ['jacuzzi'],
          beds: 0,
        })
        .expect(422);
      expect(fields(res)).toEqual({ flat_type: 'invalid', amenities: 'invalid', beds: 'invalid' });
      const long = await t
        .call('patch', `/admin/apartments/${id}`)
        .send({ layout: { cs: 'x'.repeat(1001), en: '' } })
        .expect(422);
      expect(fields(long)).toEqual({ texts: 'too_long' });
      const many = await t
        .call('patch', `/admin/apartments/${id}`)
        .send({
          labels: Array.from({ length: 9 }, (_, index) => ({ cs: `Štítek ${index}`, en: '' })),
        })
        .expect(422);
      expect(fields(many)).toEqual({ labels: 'too_many' });
      await t.call('patch', '/admin/apartments/9999').send({ beds: 2 }).expect(404);
      await t.call('patch', '/admin/apartments/abc').send({ beds: 2 }).expect(404);
    });

    it('hides an inactive apartment from the website but not from the administration', async () => {
      const id = (await t.apartmentIds())[5];
      await t.call('patch', `/admin/apartments/${id}`).send({ active: false }).expect(200);
      expect(await t.apartmentIds()).toHaveLength(5);
      await t.call('get', '/apartments/apartman-6').expect(404);
      const admin = await t.call('get', '/admin/apartments').expect(200);
      expect((admin.body as { items: unknown[] }).items).toHaveLength(6);
      await t.call('get', '/apartments/apartman-1').expect(200);
      await t.call('get', '/apartments/nowhere').expect(404);
    });
  });

  describe('photos', () => {
    let photo: Photo;

    it('starts with the catalogue of the original photos, hidden until their files are imported', async () => {
      const [{ count }] = await t.sql<{ count: number }>(
        'SELECT COUNT(*)::int AS count FROM photos',
      );
      expect(count).toBe(172);
      const admin = await t.call('get', '/admin/photos').expect(200);
      expect(admin.body).toEqual({ items: [], total: 0 });
      const gallery = await t.call('get', '/photos').expect(200);
      expect(gallery.body).toMatchObject({ items: [], total: 0, next_offset: null });
    });

    it('turns an upload into three sizes, a placeholder and an average colour', async () => {
      const [apartment] = await t.apartmentIds();
      const res = await t
        .call('post', '/admin/photos')
        .field('category', 'apartment')
        .field('apartment_id', String(apartment))
        .field('alt_cs', 'Obývací pokoj')
        .field('alt_en', 'Living room')
        .attach('file', await image(2000, 1500), 'room.png')
        .expect(201);
      photo = res.body as Photo;
      expect(photo).toMatchObject({
        category: 'apartment',
        apartment_id: apartment,
        width: 1600,
        height: 1200,
        widths: [480, 960, 1600],
        alt: { cs: 'Obývací pokoj', en: 'Living room' },
      });
      expect(photo.color).toMatch(/^#[0-9a-f]{6}$/);
      expect(photo.placeholder).toMatch(/^data:image\//);
      for (const width of photo.widths) {
        expect(existsSync(join(mediaDir, `${photo.file}-${width}.jpg`))).toBe(true);
      }
    });

    it('does not enlarge a small picture', async () => {
      const res = await t
        .call('post', '/admin/photos')
        .field('category', 'house')
        .attach('file', await image(800, 600), 'small.png')
        .expect(201);
      expect(res.body).toMatchObject({ width: 800, widths: [480, 800], apartment_id: null });
    });

    it('serves the sizes for a year and nothing else from the media folder', async () => {
      const res = await t.agent.get(`/media/${photo.file}-480.jpg`).expect(200);
      expect(res.get('Content-Type')).toBe('image/jpeg');
      expect(res.get('Cache-Control')).toContain('immutable');
      await t.agent.get(`/media/${photo.file}-481.jpg`).expect(404);
      await t.agent.get('/media/..%2F..%2Fpackage.json').expect(404);
      await t.agent.get('/media/').expect(404);
    });

    it('shows uploads in the gallery, on the apartment and as covers', async () => {
      const gallery = await t.call('get', '/photos').expect(200);
      const page = gallery.body as {
        items: Photo[];
        total: number;
        categories: Record<string, number>;
      };
      expect(page.total).toBe(2);
      expect(page.categories).toMatchObject({ apartment: 1, house: 1 });

      const filtered = await t.call('get', '/photos?category=house&limit=1').expect(200);
      expect((filtered.body as { items: Photo[] }).items).toHaveLength(1);
      const covers = await t.call('get', '/photos/covers').expect(200);
      expect(Object.keys((covers.body as { covers: object }).covers).sort()).toEqual(['house']);

      const apartment = await t.call('get', '/apartments/apartman-1').expect(200);
      const detail = apartment.body as { cover: Photo; photos: Photo[] };
      expect(detail.cover.id).toBe(photo.id);
      expect(detail.photos.map((item) => item.id)).toEqual([photo.id]);
      const list = await t.call('get', '/apartments').expect(200);
      expect((list.body as { items: { cover: Photo | null }[] }).items[0].cover?.id).toBe(photo.id);
    });

    it('refuses what is not a picture, a missing file and an apartment that does not exist', async () => {
      const text = await t
        .call('post', '/admin/photos')
        .field('category', 'house')
        .attach('file', Buffer.from('not a picture at all'), 'fake.jpg')
        .expect(422);
      expect(fields(text)).toEqual({ file: 'not_an_image' });
      const empty = await t.call('post', '/admin/photos').field('category', 'nowhere').expect(422);
      expect(fields(empty)).toEqual({ category: 'invalid', file: 'required' });
      const orphan = await t
        .call('post', '/admin/photos')
        .field('category', 'apartment')
        .field('apartment_id', '9999')
        .attach('file', await image(600, 400), 'room.png')
        .expect(422);
      expect(fields(orphan)).toEqual({ apartment_id: 'unknown' });
    });

    it('moves a photo to another category and changes its description and order', async () => {
      const res = await t
        .call('patch', `/admin/photos/${photo.id}`)
        .send({ category: 'wellness', alt: { cs: 'Sauna', en: 'Sauna' }, sort: 5 })
        .expect(200);
      expect(res.body).toMatchObject({
        category: 'wellness',
        apartment_id: null,
        alt: { cs: 'Sauna' },
        sort: 5,
      });
      const invalid = await t
        .call('patch', `/admin/photos/${photo.id}`)
        .send({ category: 'apartment' })
        .expect(422);
      expect(fields(invalid)).toEqual({ apartment_id: 'unknown' });
    });

    it('deletes a photo together with its files', async () => {
      await t.call('delete', `/admin/photos/${photo.id}`).expect(204);
      expect(existsSync(join(mediaDir, `${photo.file}-480.jpg`))).toBe(false);
      await t.agent.get(`/media/${photo.file}-480.jpg`).expect(404);
      await t.call('delete', `/admin/photos/${photo.id}`).expect(404);
    });
  });

  describe('news', () => {
    let id: number;

    it('keeps a draft away from the website until it is published', async () => {
      const draft = await t
        .call('post', '/admin/news')
        .send({
          title: { cs: 'Sezóna začíná', en: '' },
          body: { cs: 'Vleky jedou od soboty.', en: '' },
        })
        .expect(201);
      id = (draft.body as { id: number }).id;
      expect(draft.body).toMatchObject({ published: false });
      expect(
        ((await t.call('get', '/news').expect(200)).body as { items: unknown[] }).items,
      ).toEqual([]);

      const published = await t
        .call('patch', `/admin/news/${id}`)
        .send({
          title: { cs: 'Sezóna začíná', en: 'The season starts' },
          body: { cs: 'Vleky jedou od soboty.', en: 'Lifts run from Saturday.' },
          published: true,
          published_at: '2026-12-05',
        })
        .expect(200);
      expect(published.body).toMatchObject({ published: true, published_at: '2026-12-05' });
      const news = await t.stranger('get', '/news').expect(200);
      expect((news.body as { items: unknown[] }).items).toEqual([published.body]);
    });

    it('needs a Czech title and text, and a real date', async () => {
      const res = await t
        .call('post', '/admin/news')
        .send({ title: { cs: '', en: 'Only English' }, published_at: '5. 12. 2026' })
        .expect(422);
      expect(fields(res)).toEqual({
        title_cs: 'required',
        body_cs: 'required',
        published_at: 'invalid',
      });
    });

    it('deletes an item', async () => {
      await t.call('delete', `/admin/news/${id}`).expect(204);
      expect(
        ((await t.call('get', '/admin/news').expect(200)).body as { items: unknown[] }).items,
      ).toEqual([]);
    });
  });
});
