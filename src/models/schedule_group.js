'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class ScheduleGroup extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
        }
    };
    ScheduleGroup.init({
        idSchedule: DataTypes.UUID,
        idGroup: DataTypes.INTEGER
    }, {
        sequelize,
        modelName: 'ScheduleGroup',
    });
    return ScheduleGroup;
};