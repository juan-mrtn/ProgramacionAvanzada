import { Body, Controller, Post } from '@nestjs/common';
import { AppService } from './app.service';

class CreateTxnDto {
  fromAccount: string;
  toAccount: string;
  amount: number;
  currency: string;
  userId: string;
}

@Controller('transactions')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post()
  async create(@Body() dto: CreateTxnDto) {
    return this.appService.initiateTransaction(dto);
  }
}

