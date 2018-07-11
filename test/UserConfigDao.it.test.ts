import { instance } from "../lib/UserConfigDao";
import config from '../lib/config';
import { UserConfig } from "../models/UserConfig";
describe('UserConfigDao', function() {
  const userConfigDao = instance;

  describe('#tableExists', () => {
    it('returns false when not exists', async () => {
      try {
        await userConfigDao.dropTable();
      } catch (err) {
        console.error(err);
      }
      return userConfigDao.tableExists()
        .catch((err) => {
          fail('Promise rejected; it should have resolved.  Err: ' + err);
        })
        .then((tableExists) => {
          expect(tableExists).toBeFalsy();
        });
    });
    it('returns true when exists', async () => {
      try {
        await userConfigDao.createTable();
      } catch (err) {
        console.error(err);
      }
      try {
        const tableExists = await userConfigDao.tableExists();
        expect(tableExists).toBeTruthy();
      } catch (err) {
        fail('Promise rejected; it should have resolved.  Err: ' + err);
      }
    });
  });

  describe('DynamoDB', () => {
    beforeAll(async () => {
      try {
        await userConfigDao.dropTable();
      } catch (err) {
        console.error(err);
      }
      try {
        await userConfigDao.createTable();
      } catch (err) {
        throw err;
      }
    });
    it('puts em without dying', async () => {
      try{ 
        await userConfigDao.putToDb(new UserConfig('amzn1.ask.account.[unique-value-here]', 'woburn', 'MA'));
      } catch (err) {
        fail(err);
      }
    });

    it('puts em and gets one', async () => {
      const userId= 'amzn1.ask.account.[unique-value-here]';
      await userConfigDao.putToDb(new UserConfig(userId, 'woburn', 'MA'));
      const userConfig = await userConfigDao.getConfig(userId);
      expect(userConfig.city).toEqual('woburn');
      expect(userConfig.state).toEqual('MA');
    })
  });
});
