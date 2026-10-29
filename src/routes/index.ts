import { Router } from 'express';
import { env } from '../config/env.js';
import { authRoutes } from '../modules/auth/routes/auth.routes.js';
import { userRoutes } from '../modules/users/routes/user.routes.js';
import { companyRoutes } from '../modules/companies/routes/company.routes.js';
import { sectorRoutes } from '../modules/sectors/routes/sector.routes.js';
import { assetRoutes } from '../modules/assets/routes/asset.routes.js';
import { deviceRoutes } from '../modules/devices/routes/device.routes.js';
import { sensorRoutes } from '../modules/sensors/routes/sensor.routes.js';
import { readingRoutes } from '../modules/readings/routes/reading.routes.js';
import { maintenanceRoutes } from '../modules/maintenances/routes/maintenance.routes.js';
import { alertRoutes } from '../modules/alerts/routes/alert.routes.js';
import { dashboardRoutes } from '../modules/dashboard/routes/dashboard.routes.js';

export const apiRoutes = Router();

apiRoutes.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', mockMode: env.MOCK_MODE, env: env.NODE_ENV } });
});

apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/users', userRoutes);
apiRoutes.use('/companies', companyRoutes);
apiRoutes.use('/sectors', sectorRoutes);
apiRoutes.use('/assets', assetRoutes);
apiRoutes.use('/devices', deviceRoutes);
apiRoutes.use('/sensors', sensorRoutes);
apiRoutes.use('/readings', readingRoutes);
apiRoutes.use('/maintenances', maintenanceRoutes);
apiRoutes.use('/alerts', alertRoutes);
apiRoutes.use('/dashboard', dashboardRoutes);
