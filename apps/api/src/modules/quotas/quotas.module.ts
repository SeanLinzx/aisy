import { Module } from '@nestjs/common';
import { QuotasController } from './quotas.controller';
import { QuotasService } from './quotas.service';

@Module({ controllers: [QuotasController], providers: [QuotasService] })
export class QuotasModule {}
