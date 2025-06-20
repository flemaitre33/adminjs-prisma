import { PrismaClient } from '@prisma/client';
import { BaseProperty, BaseRecord, Filter } from 'adminjs';
import { jest } from '@jest/globals';

import { Resource } from '../src/Resource.js';
import { getModelByName } from '../src/utils/get-model-by-name.js';

jest.useFakeTimers();

const prisma = new PrismaClient();

/**
 * Test temporarily turned off due to Prisma bug: https://github.com/prisma/prisma/issues/18146
 */
describe('Resource', () => {
  let resource: Resource;

  const data = {
    name: 'Someone',
    email: 'random@email.com',
  };

  beforeEach(async () => {
    resource = new Resource({ model: getModelByName('User'), client: prisma });

    await prisma.profile.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.post.deleteMany({});
  });

  describe('.isAdapterFor', () => {
    it('returns true when Prisma model is given', () => {
      expect(
        Resource.isAdapterFor({
          model: getModelByName('Post'),
          client: prisma,
        }),
      ).toEqual(true);
    });

    it('returns false for any other kind of resources', () => {
      expect(Resource.isAdapterFor({} as any)).toEqual(false);
    });
  });

  describe('#databaseType', () => {
    it('returns database dialect', () => {
      expect(resource.databaseType()).toEqual('postgresql');
    });
  });

  describe('#id', () => {
    it('returns the name of the entity', () => {
      expect(resource.id()).toEqual('User');
    });
  });

  describe('#properties', () => {
    it('returns all the properties', () => {
      expect(resource.properties()).toHaveLength(3);
    });

    it('returns all properties with the correct position', () => {
      expect(
        resource.properties().map((property) => property.position()),
      ).toEqual([0, 1, 2]);
    });
  });

  describe('#property', () => {
    it('returns selected property', () => {
      const property = resource.property('id');

      expect(property).toBeInstanceOf(BaseProperty);
    });
  });

  describe('#count', () => {
    it('returns number of records', async () => {
      expect(await resource.count({} as Filter)).toEqual(0);
    });
  });

  describe('#create', () => {
    it('returns params', async () => {
      const params = await resource.create(data);

      expect(params.id).toBeDefined();
    });
  });

  // describe('#update', () => {
  //   let record: BaseRecord | null;

  //   it('updates record name', async () => {
  //     const params = await resource.create(data);
  //     record = await resource.findOne(params.id);
  //     const name = 'Michael';

  //     console.log(record);
  //     await resource.update((record && record.id()) as string, {
  //       name,
  //     });
  //     const recordInDb = await resource.findOne(
  //       (record && record.id()) as string,
  //     );

  //     expect(recordInDb && recordInDb.get('name')).toEqual(name);
  //   });
  // });

  describe('#find', () => {
    let record: BaseRecord[];

    it('finds by record name', async () => {
      const params = await resource.create(data);
      await resource.create({
        name: 'Another one',
        email: 'another@email.com',
      });

      const filter = new Filter(undefined, resource);
      filter.filters = {
        name: {
          path: 'name',
          value: params.name,
          property: resource.property('name') as BaseProperty,
        },
      };
      record = await resource.find(filter);

      expect(record[0] && record[0].get('name')).toEqual(data.name);
      expect(record[0] && record[0].get('email')).toEqual(data.email);
      expect(record.length).toEqual(1);
    });

    it('finds by record uuid column', async () => {
      const uuidResource = new Resource({
        model: getModelByName('UuidExample'),
        client: prisma,
      });
      const params = await uuidResource.create({ label: 'test' });
      await uuidResource.create({ label: 'another test' });

      const filter = new Filter(undefined, uuidResource);
      filter.filters = {
        id: {
          path: 'id',
          value: params.id,
          property: uuidResource.property('id') as BaseProperty,
        },
      };
      record = await uuidResource.find(filter);

      expect(record[0] && record[0].get('id')).toEqual(params.id);
      expect(record[0] && record[0].get('label')).toEqual('test');
      expect(record.length).toEqual(1);
    });
  });

  describe('references', () => {
    let profile;
    let user;
    let profileResource;

    beforeEach(async () => {
      user = await resource.create(data);
      profileResource = new Resource({
        model: getModelByName('Profile'),
        client: prisma,
      });
    });

    it('creates new resource', async () => {
      profile = await profileResource.create({
        bio: 'Example',
        user: user.id,
      });

      expect(profile.user).toEqual(user.id);
    });
  });

  describe('#delete', () => {
    let user;

    beforeEach(async () => {
      user = await resource.create(data);
    });

    it('deletes the resource', async () => {
      await resource.delete(user.id);
      expect(await resource.count({} as Filter)).toEqual(0);
    });
  });
});
