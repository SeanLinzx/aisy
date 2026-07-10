import { Module } from '@nestjs/common';
import { PlazaController } from './plaza.controller';
import { PlazaService } from './plaza.service';

@Module({ controllers: [PlazaController], providers: [PlazaService] })
export class PlazaModule {}
