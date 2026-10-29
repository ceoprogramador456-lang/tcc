import { ForbiddenError, NotFoundError } from '../../../shared/errors/app-error.js';
import type { ListOptions } from '../../../interfaces/repository.interface.js';
import type { AuthenticatedDevice, AuthenticatedUser } from '../../../types/express.js';
import { sensorService } from '../../sensors/services/sensor.service.js';
import { createSensorRepository } from '../../sensors/repositories/sensor.repository.js';
import { createDeviceRepository } from '../../devices/repositories/device.repository.js';
import { createReadingRepository } from '../repositories/reading.repository.js';
import type { IngestReadingDTO } from '../dtos/reading.dtos.js';

const repository = createReadingRepository();
const sensorRepository = createSensorRepository();
const deviceRepository = createDeviceRepository();

export const readingService = {
  async list(user: AuthenticatedUser, sensorId: number, options: ListOptions = {}) {
    await sensorService.getAccessible(user, sensorId);
    return repository.list({ ...options, filter: { ...options.filter, sensorId } });
  },

  /** Usado pelo endpoint de ingestão autenticado por X-Token (firmware do ESP32). */
  async ingest(device: AuthenticatedDevice, payload: IngestReadingDTO) {
    if (payload.esp_id !== device.espId) {
      throw new ForbiddenError('esp_id do payload não corresponde ao dispositivo autenticado.');
    }

    const sensor = await sensorRepository.findByDeviceAndSensorId(device.id, payload.sensor_id);
    if (!sensor) {
      throw new NotFoundError(`Sensor "${payload.sensor_id}" para o ESP32 "${payload.esp_id}"`);
    }

    const [reading] = await Promise.all([
      repository.create({ sensorId: sensor.id, vazao: payload.vazao }),
      deviceRepository.touchContact(device.id),
    ]);
    return reading;
  },
};
