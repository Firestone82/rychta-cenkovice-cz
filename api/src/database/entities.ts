import { Apartment } from '../apartments/apartment.entity.js';
import { RefreshToken } from '../auth/refresh-token.entity.js';
import { BookingUnit } from '../bookings/booking-unit.entity.js';
import { Booking } from '../bookings/booking.entity.js';
import { Message } from '../messages/message.entity.js';
import { News } from '../news/news.entity.js';
import { Photo } from '../photos/photo.entity.js';
import { User } from '../users/user.entity.js';

export const ENTITIES = [User, RefreshToken, Apartment, Message, Booking, BookingUnit, Photo, News];
