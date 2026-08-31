import { StorageProvider } from "./storage-provider.interface";
import { CloudinaryStorageProvider } from "./cloudinary/cloudinary-storage.provider";
import { FakeStorageProvider } from "./fake/fake-storage.provider";

/**
 * Selección del adaptador de almacenamiento según el entorno.
 * - Test: FakeStorageProvider (en memoria)
 * - Producción/desarrollo: CloudinaryStorageProvider
 */
export function createStorageProvider(): StorageProvider {
  if (process.env.NODE_ENV === "test") {
    return new FakeStorageProvider();
  }
  return new CloudinaryStorageProvider();
}
