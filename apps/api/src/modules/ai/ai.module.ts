import { Global, Module } from '@nestjs/common';
import { ProviderRegistry } from './provider-registry';

@Global()
@Module({
  providers: [ProviderRegistry],
  exports: [ProviderRegistry],
})
export class AiModule {}
