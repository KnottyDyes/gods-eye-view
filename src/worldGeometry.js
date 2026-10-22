import { Ellipsoid } from 'cesium';

let activeEllipsoid = Ellipsoid.WGS84;

/** Displayed-body geometry only; Earth-data frames must remain explicit. */
export function getWorldEllipsoid() {
  return activeEllipsoid;
}

/** Configure before viewer creation; return the previous value to restore. */
export function setWorldEllipsoid(ellipsoid) {
  const previous = activeEllipsoid;
  activeEllipsoid = ellipsoid;
  return previous;
}

/** Radius in metres, preserving each historical Earth convention exactly. */
export function getWorldRadius(convention = 'mean') {
  const ellipsoid = getWorldEllipsoid();
  const earth = ellipsoid.equals(Ellipsoid.WGS84);
  const { x, y, z } = ellipsoid.radii;
  switch (convention) {
    case 'mean':
      return earth ? 6371000 : (x + y + z) / 3;
    case 'iugg':
      return earth ? 6371008.8 : (x + y + z) / 3;
    case 'equatorial':
      return earth ? 6378137 : ellipsoid.maximumRadius;
    default:
      throw new RangeError(`Unknown radius convention: ${convention}`);
  }
}
