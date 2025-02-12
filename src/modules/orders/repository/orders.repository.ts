import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { OrderEntity } from '../../../common/entities/order.entity';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { GetAllOrdersQuery } from '../query/get-all-orders.query';
import { InjectRepository } from '@nestjs/typeorm';
import { UsersRepository } from '../../users/repository/users.repository';

@Injectable()
export class OrdersRepository {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly ordersRepository: Repository<OrderEntity>,
    private readonly usersRepository: UsersRepository,
  ) {}

  getAll({
    perPage,
    page,
    categoryIds,
    sort,
    typeBudget,
    city,
    search,
  }: GetAllOrdersQuery) {
    const queryBuilder = this.ordersRepository
      .createQueryBuilder('o') // Используем 'o' вместо 'order'
      .leftJoinAndSelect('o.categories', 'category')
      .where('o.deletedAt IS NULL');

    // Фильтрация по категориям
    if (categoryIds) {
      // Убираем дубликаты с помощью Set и проверяем, что это массив
      const uniqueCategoryIds = Array.from(
        new Set(Array.isArray(categoryIds) ? categoryIds : [categoryIds]),
      );
      queryBuilder.andWhere('category.id IN (:...categoryIds)', {
        categoryIds: uniqueCategoryIds,
      });
    }

    // Фильтрация по типу бюджета
    if (typeBudget) {
      if (typeBudget === 'highBudget') {
        queryBuilder.orderBy('o.totalBudget', 'DESC'); // Заказы с большим бюджетом
      } else if (typeBudget === 'lowBudget') {
        queryBuilder.orderBy('o.totalBudget', 'ASC'); // Заказы с меньшим бюджетом
      } else {
        queryBuilder.andWhere('o.chronometry = :chronometry', {
          chronometry: typeBudget,
        }); // Фильтрация по типу (project, hour, shift)
      }
    }

    // Фильтрация по городу
    if (city) {
      queryBuilder.andWhere('o.city = :city', { city });
    }

    // Поиск по title и description
    if (search) {
      queryBuilder.andWhere(
        '(o.title LIKE :search OR o.description LIKE :search)',
        {
          search: `%${search}%`, // Ищем по частичному совпадению
        },
      );
    }

    // Сортировка по параметрам
    switch (sort) {
      case 'views':
        queryBuilder.orderBy('o.viewsCount', 'DESC');
        break;
      case 'popularity':
        queryBuilder.orderBy('o.viewsCount', 'DESC');
        break;
      case 'match':
        queryBuilder.orderBy('o.title', 'ASC'); // Логика для "match" (можно уточнить)
        break;
      default:
        queryBuilder.orderBy('o.createdAt', 'DESC');
        break;
    }

    // Пагинация
    queryBuilder.skip(perPage * (page - 1)).take(perPage);

    return queryBuilder.getManyAndCount();
  }

  async getAllOrdersForSync() {
    return this.ordersRepository.find({
      relations: ['categories'], // Подгружаем связанные категории
    });
  }

  async createOrder(createOrderDto: CreateOrderDto, userId: number) {
    // Fetch the user by userId
    const user = await this.usersRepository.findUserById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create the order, with the actual UserEntity instance for the client
    const order = this.ordersRepository.create({
      ...createOrderDto,
      client: user, // Pass the UserEntity instance, not just the userId
    });

    return this.ordersRepository.save(order);
  }

  async findWithRelations(): Promise<OrderEntity[]> {
    return this.ordersRepository.find({
      relations: ['client', 'category', 'responses'],
    });
  }

  async findOrderById(id: number): Promise<OrderEntity | null> {
    return await this.ordersRepository.findOne({
      where: { id },
      relations: ['client', 'categories', 'responses'],
    });
  }

  async updateOrder(
    id: number,
    updateOrderDto: UpdateOrderDto,
  ): Promise<OrderEntity> {
    const order = await this.findOrderById(id);
    if (!order) {
      throw new Error(`Order with ID ${id} not found`);
    }
    Object.assign(order, updateOrderDto);
    return this.ordersRepository.save(order);
  }

  async removeOrder(id: number): Promise<void> {
    const order = await this.findOrderById(id);
    if (order) {
      await this.ordersRepository.softRemove(order);
    }
  }
}
