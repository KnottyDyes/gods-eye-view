import test from 'node:test';
import assert from 'node:assert/strict';
import { Cartesian3, Cartographic, Ellipsoid } from 'cesium';
import {
  getWorldEllipsoid,
  getWorldRadius,
  setWorldEllipsoid,
} from './worldGeometry.js';
import { applicationViewerOptions, configureAtmosphere } from './app/viewer.js';

test('Earth atmosphere retains all four exact settings, including WGS84 clones', () => {
  for (const ellipsoid of [Ellipsoid.WGS84, Ellipsoid.clone(Ellipsoid.WGS84)]) {
    const previous = setWorldEllipsoid(ellipsoid);
    try {
      const skyAtmosphere = {};
      configureAtmosphere({ scene: { skyAtmosphere } });
      assert.deepEqual(skyAtmosphere, {
        show: true,
        atmosphereLightIntensity: 18,
        saturationShift: -0.12,
        brightnessShift: -0.08,
      });
      assert.doesNotThrow(() => configureAtmosphere({ scene: {} }));
    } finally {
      setWorldEllipsoid(previous);
    }
  }
});

test('synthetic geometry never writes Earth atmosphere settings', () => {
  const previous = setWorldEllipsoid(new Ellipsoid(900, 900, 600));
  try {
    const skyAtmosphere = Object.freeze({ show: false });
    configureAtmosphere({ scene: { skyAtmosphere } });
    assert.deepEqual(skyAtmosphere, { show: false });
    assert.doesNotThrow(() => configureAtmosphere({ scene: {} }));
  } finally {
    setWorldEllipsoid(previous);
  }
});

test('active ellipsoid defaults to the exact WGS84 singleton', () => {
  assert.equal(getWorldEllipsoid(), Ellipsoid.WGS84);
  assert.equal(Ellipsoid.default, Ellipsoid.WGS84);
});

test('all historical Earth radii remain exact in metres', () => {
  assert.equal(getWorldRadius(), 6371000);
  assert.equal(getWorldRadius('mean'), 6371000);
  assert.equal(getWorldRadius('iugg'), 6371008.8);
  assert.equal(getWorldRadius('equatorial'), 6378137);
});

test('unknown conventions fail rather than choosing a different scale', () => {
  assert.throws(() => getWorldRadius('unknown'), RangeError);
});

test('WGS84 Cartesian outputs are identical at representative coordinates', () => {
  for (const [longitude, latitude, height] of [
    [0, 0, 0],
    [180, 0, 10],
    [-180, -90, 0],
    [45, 90, 1000],
    [-104.99, 39.74, 1600],
  ]) {
    const point = Cartographic.fromDegrees(longitude, latitude, height);
    assert.deepEqual(
      getWorldEllipsoid().cartographicToCartesian(point),
      Ellipsoid.WGS84.cartographicToCartesian(point),
    );
  }
});

test('WGS84 inverse geometry matches the existing explicit frame', () => {
  const point = new Cartesian3(4000000, 3000000, 5000000);
  assert.deepEqual(
    getWorldEllipsoid().cartesianToCartographic(point),
    Ellipsoid.WGS84.cartesianToCartographic(point),
  );
});

test('synthetic geometry swaps and restores without changing Cesium defaults', () => {
  const synthetic = new Ellipsoid(900, 900, 600);
  const previous = setWorldEllipsoid(synthetic);
  try {
    assert.equal(previous, Ellipsoid.WGS84);
    assert.equal(getWorldEllipsoid(), synthetic);
    assert.equal(getWorldRadius('mean'), 800);
    assert.equal(getWorldRadius('iugg'), 800);
    assert.equal(getWorldRadius('equatorial'), 900);
    assert.equal(Ellipsoid.default, Ellipsoid.WGS84);
  } finally {
    assert.equal(setWorldEllipsoid(previous), synthetic);
  }
  assert.equal(getWorldEllipsoid(), Ellipsoid.WGS84);
  assert.equal(getWorldRadius('iugg'), 6371008.8);
});

test('WGS84 clones preserve the same Earth radius conventions', () => {
  const previous = setWorldEllipsoid(Ellipsoid.clone(Ellipsoid.WGS84));
  try {
    assert.equal(getWorldRadius('mean'), 6371000);
    assert.equal(getWorldRadius('iugg'), 6371008.8);
    assert.equal(getWorldRadius('equatorial'), 6378137);
  } finally {
    setWorldEllipsoid(previous);
  }
});

test('viewer defaults preserve Earth atmosphere creation and use WGS84', () => {
  const creditContainer = {};
  const options = applicationViewerOptions(creditContainer);
  assert.equal(options.ellipsoid, Ellipsoid.WGS84);
  assert.equal(options.creditContainer, creditContainer);
  assert.equal(Object.hasOwn(options, 'skyAtmosphere'), false);
});

test('viewer uses configured geometry without creating Earth atmosphere', () => {
  const synthetic = new Ellipsoid(900, 900, 600);
  const previous = setWorldEllipsoid(synthetic);
  try {
    const options = applicationViewerOptions({});
    assert.equal(options.ellipsoid, synthetic);
    assert.equal(options.skyAtmosphere, false);
  } finally {
    setWorldEllipsoid(previous);
  }
  assert.equal(applicationViewerOptions({}).ellipsoid, Ellipsoid.WGS84);
});

test('nested configuration restores the exact previous ellipsoid', () => {
  const first = new Ellipsoid(12, 12, 9);
  const second = new Ellipsoid(6, 6, 6);
  const original = setWorldEllipsoid(first);
  try {
    const previous = setWorldEllipsoid(second);
    try {
      assert.equal(previous, first);
      assert.equal(getWorldRadius(), 6);
    } finally {
      setWorldEllipsoid(previous);
    }
    assert.equal(getWorldEllipsoid(), first);
    assert.equal(getWorldRadius(), 11);
  } finally {
    setWorldEllipsoid(original);
  }
});

test('triaxial synthetic geometry uses all three axes for its mean', () => {
  const previous = setWorldEllipsoid(new Ellipsoid(12, 9, 6));
  try {
    assert.equal(getWorldRadius('mean'), 9);
    assert.equal(getWorldRadius('iugg'), 9);
    assert.equal(getWorldRadius('equatorial'), 12);
  } finally {
    setWorldEllipsoid(previous);
  }
});
