import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from '../repository/users.repository';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserEntity } from '../../../common/entities/user.entity';
import { CreateUserDevicesDto } from '../dto/create-user-devices.dto';
import { AccessoryRepository } from '../repository/accessory.repository';
import { UpdateLoginAndPasswordDto } from '../dto/update-login-and-password.dto';
import { GetAllMobilographsQuery } from '../query/get-all-mobilographs.query';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly accessoryRepository: AccessoryRepository,
  ) {}

  async findAllMobilographsByCity(query: GetAllMobilographsQuery) {
    return await this.usersRepository.findByTypeAndCity(query);
  }

  async findOne(id: number): Promise<UserEntity | null> {
    return this.usersRepository.findUserById(id);
  }

  async updateEmailAndPassword(
    id: number,
    updateLoginAndPassword: UpdateLoginAndPasswordDto,
  ) {
    const user = await this.usersRepository.findUserById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return await this.usersRepository.updateLoginAndPassword(
      id,
      updateLoginAndPassword,
    );
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    return await this.usersRepository.updateUser(id, updateUserDto);
  }

  async remove(id: number): Promise<void> {
    return this.usersRepository.removeUser(id);
  }

  async saveMobilographDevices(
    userId: number,
    createMobilographDeviceDto: CreateUserDevicesDto,
  ): Promise<UserEntity> {
    const user = await this.usersRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} is not your id`);
    }

    if (createMobilographDeviceDto.device) {
      user.device = createMobilographDeviceDto.device;
    }

    if (createMobilographDeviceDto.accessories) {
      const accessories = await this.accessoryRepository.saveAccessories(
        createMobilographDeviceDto.accessories,
      );
      user.accessories = accessories;
    }

    // Сохраняем изменения в базе
    return this.usersRepository.save(user);
  }
}
