import { getCustomRepository } from "typeorm";
import { SurveysRepository } from "../repositories/SurveysRepository";
import { SurveysUsersRepository } from "../repositories/SurveysUsersRepository";
import { UsersRepository } from "../repositories/UsersRepository";
import { Request, Response} from 'express';
import SendMailService from "../services/SendMailService";
import { resolve } from "path";
import { AppError } from "../errors/AppError";

class SendMailController{

    async execute(req: Request, res: Response) {
        const { email, survey_id} = req.body;

        const userRepository = getCustomRepository(UsersRepository);
        const surveysRepository = getCustomRepository(SurveysRepository);
        const surveysUsersRepository = getCustomRepository(SurveysUsersRepository);

        const userAlreadyExists = await userRepository.findOne({email});

        if(!userAlreadyExists){
            throw new AppError("User does not exists.");
        }

        const surveyAlreadyExists = await surveysRepository.findOne({id:survey_id})

        if(!surveyAlreadyExists){
            throw new AppError("Survey does not exists.");
        }

        const npsPath = resolve(__dirname, "..", "views", "emails", "npsMail.hbs");
        
        const surveyUserAlreadyExists = await surveysUsersRepository.findOne({
            where: {user_id: userAlreadyExists.id, value:null},
            relations: ["user","survey"]
        });

        const variables = {
            name: userAlreadyExists.name,
            title: surveyAlreadyExists.title,
            description: surveyAlreadyExists.description,
            id: "",
            link: process.env.URL_MAIL
        };

        if(surveyUserAlreadyExists){
            variables.id = surveyAlreadyExists.id;
            await SendMailService.execute(email, surveyAlreadyExists.title, variables, npsPath);
            return res.json(surveyUserAlreadyExists);
        }
        
        const surveyUser = surveysUsersRepository.create({
            user_id: userAlreadyExists.id,
            survey_id
        })

        await surveysUsersRepository.save(surveyUser);

        variables.id = surveyUser.id;

        await SendMailService.execute(email,surveyAlreadyExists.title, variables, npsPath);

        return res.status(201).json(surveyUser);
    }


}

export {SendMailController};