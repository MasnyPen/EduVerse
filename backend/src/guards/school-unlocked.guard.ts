import { BadRequestException, CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { UsersService } from "src/users/users.service";

@Injectable()
export class SchoolUnlockedGuard implements CanActivate {
  constructor(private usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId = req.user.userId;
    const schoolId = req.params.schoolId;

    if (!(await this.usersService.getUnlockedSchools(userId)).includes(schoolId)) {
        throw new BadRequestException("Musisz odblokować szkołę aby tego użyć!")
    }

    return true;
  }
}
