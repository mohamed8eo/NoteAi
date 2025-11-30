import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcryptjs';
import { db } from 'src/db';
import { Users } from 'src/db/schema';
import { eq } from 'drizzle-orm';
import { JwtService } from '@nestjs/jwt';
import { LogInDto } from './dto/logIn.dto';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}
  private async IsUserExisting(email: string) {
    const existing = await db
      .select({
        id: Users.id,
        dbEmail: Users.email,
        hashPasswod: Users.password,
      })
      .from(Users)
      .where(eq(Users.email, email));

    if (existing.length > 0) {
      return {
        success: true,
        existing,
      };
    }
    return {
      success: false,
      existing,
    };
  }
  //generate Tokens
  private generateAccessToken(user: { id: string; email: string }) {
    const payload = { sub: user.id, email: user.email };

    // Access token expires in 15 minutes
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    return accessToken;
  }

  private generateRefreshToken(user: { id: string; email: string }) {
    const payload = { sub: user.id, email: user.email };

    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET environment variable is not set');
    }

    // Refresh token expires in 7 days
    const refreshToken = this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: '7d',
    });

    return refreshToken;
  }

  private generateTokens(user: { id: string; email: string }) {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
    };
  }
  //register
  async register(registerDto: RegisterDto) {
    try {
      console.log('--- Starting registration process ---');
      const { name, email, password } = registerDto;
      const hashPassowrd = await bcrypt.hash(password, 10);
      console.log('1. Password hashed:', hashPassowrd);

      //Check if User already exist
      const existing = await this.IsUserExisting(email);

      if (existing.success === true) {
        console.log('--- User exists, throwing conflict exception ---');
        throw new ConflictException('Email already exists. Please sign in.');
      }

      console.log('3. Inserting new user into database...');
      const insertedUsers = await db
        .insert(Users)
        .values({
          email,
          password: hashPassowrd,
          name,
        })
        .returning();

      console.log('4. Database insert result:', insertedUsers);

      const [user] = insertedUsers;
      console.log('5. User object after destructuring:', user);

      if (!user) {
        console.error(
          '--- CRITICAL: User object is undefined after insert. Halting. ---',
        );
        throw new Error(
          'Failed to create user. User object is undefined after database insert.',
        );
      }

      // Generate tokens
      const tokens = this.generateTokens(user);
      console.log('6. Tokens generated.');

      //store refresh token in db
      await db
        .update(Users)
        .set({ refreshToken: tokens.refreshToken })
        .where(eq(Users.email, email));
      console.log('7. Refresh token stored in DB.');

      console.log('--- Registration process successful ---');
      return {
        Success: true,
        Message: 'Create User Successfully!',
        user,
        Tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      };
    } catch (error) {
      console.error('--- Registration error ---', error);
      // Re-throw ConflictException as-is
      if (error instanceof ConflictException) {
        throw error;
      }
      // For other errors, throw a more descriptive error
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Registration failed: ${errorMessage}`);
    }
  }

  //LogIN
  async logIn(logInDto: LogInDto) {
    const { email, password } = logInDto;

    //check if user exist
    const existing = await this.IsUserExisting(email);
    if (existing.success === false) {
      throw new NotFoundException('Email or Password are Not Correct');
    }
    const IsPasswordSame = await bcrypt.compare(
      password,
      existing.existing[0].hashPasswod,
    );
    if (IsPasswordSame === false) {
      throw new NotFoundException('Email or Password are Not Correct');
    }
    const user = existing.existing[0];
    //store refresh token in db
    const tokens = this.generateTokens({
      id: user.id,
      email: user.dbEmail,
    });
    await db
      .update(Users)
      .set({ refreshToken: tokens.refreshToken })
      .where(eq(Users.email, email));
    //generate tokens
    return {
      Success: true,
      Message: 'Login Successfully!',
      user,
      Tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
  }

  //LogOut
  async logOut(userId: string) {
    //check if refresh token is empty
    await db
      .update(Users)
      .set({
        refreshToken: '',
      })
      .where(eq(Users.id, userId));
    return {
      success: true,
      message: 'Logged out successfully',
    };
  }
}
